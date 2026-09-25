# Contributing to @cspell/parser-typescript-tree-sitter-wasm

This is a contributor-facing walkthrough of how the parsers in `src/parsers.ts` and `src/walk.ts` work.
`README.md` is written for someone using the plugin; this file is for someone changing it. See the repo root
`CONTRIBUTING.md` for the general package shape (`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`,
`samples/`). This package has no `./parser` subpath: the plugin is its only entry point
(`docs/ADRs/typescript-parser-split/0005-plugin-only-entry-point.md`).

## WASM initialization

`@vscode/tree-sitter-wasm`'s `Parser.init()`/`Language.load()` are async, but cspell's `Parser` contract
requires `parse()` to stay synchronous - so this module does its one-time init via top-level await; a
consumer only ever reaches it through a (necessarily async) dynamic `import()`, so every grammar is ready by
the time that resolves. `resolveWasmFile()` uses `createRequire` to locate the bundled `.wasm` files,
since they're not resolvable through a static import. Also unlike the native binding: every `SyntaxNode`
accessor here mints a fresh wrapper object, so node-identity comparisons throughout this file use `.equals()`
rather than `===`.

## Shape of the parser

The plugin has one parser per file type, each named after it (`src/parsers.ts`). Each parser always uses the
same [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar, whatever the filename: JavaScript for
`javascript` and `javascriptreact`, TypeScript for `typescript`, and TSX for `typescriptreact`
(`docs/ADRs/typescript-parser-split/0003-grammars.md`). `collectParsedTexts(grammar, content, filename)` parses
`content` with that grammar, then makes a single pass over the whole AST (`walk`), emitting one `ParsedText`
per spell-checkable leaf. A "leaf" is:

- an identifier of some kind (variable/property/type/label/...),
- a string or template literal fragment,
- a comment,
- non-blank JSX text.

Everything else - keywords, punctuation, numeric literals, and any node type not covered above - contributes
nothing to the output. Since cspell only ever checks what's inside `parsedTexts`, this is how the parser
excludes syntax noise: by never emitting it, not by filtering it out afterwards.

`walk` is a generator, taking two things down through the recursion alongside the current AST node:

- `bindingScope: BindingScope | undefined` - the shadowing chain (see below).
- `imports: ImportBindings` - constant for the whole parse.

Most node types fall through to the generic handling at the bottom of `walk` (recurse into
`namedChildren`); a `switch` at the top special-cases node types that need different treatment: comments,
strings, template literals, JSX text, `statement_block` (for shadowing), and everything
import/export/member-access related.

### Declaration names

A node's own "name" isn't always under a `name` field: `required_parameter`/`optional_parameter` list `name`
as a possible grammar field, but for a plain identifier parameter the identifier actually comes through under
`pattern` instead - `name` is `null`. `declarationNameNode()` tries `name` first and falls back to `pattern`.
This is used by `parameterNames()` for shadowing detection (see below) - it silently found nothing for _any_
function until this fallback was added, because it was reading a field that was always empty. If a lookup
for a node's name ever seems to silently fail, suspect this field first.

The JavaScript grammar has no `required_parameter`: a parameter is a bare `identifier`, or an
`assignment_pattern` (its `left` field) when it has a default. `parameterNameNode()` handles both before
falling back to `declarationNameNode()`.

## Tags

Each segment carries `tags`. A tag is a dot-separated hierarchical name used
as the key of the `ParsedTags` object, with `true` as its value (e.g. `'comment.block.doc': true`), not a
category-name key holding a subtype string - this is what lets a consumer match a broad key like
`comment.block` against a more specific tag like `comment.block.doc`. See `README.md`'s
[Tags](README.md#tags) table for what each one means to a consumer.

`hierarchicalTags(tag)` builds the whole ancestor chain for a dotted tag - e.g.
`hierarchicalTags('comment.block.doc')` is `{ comment: true, 'comment.block': true, 'comment.block.doc':
true }` - so every leaf's `tags` object carries all of its ancestors, not just the most specific segment.
Emitting the whole chain means a consumer can filter on `tags.comment` directly, without needing its own
prefix-matching logic just to ask "is this any kind of comment?"

The set of possible tags is fixed and known ahead of time, so `hierarchicalTags` is only ever called at
module load time, to build module-level constants (`STRING_SINGLE_QUOTE_TAG`, `COMMENT_BLOCK_DOC_TAG`,
`identifierTagByKind.property`, ...) - never per emitted segment. `quoteTag`/`commentTag` return one of
those shared constants rather than allocating a fresh object per leaf, and `identifierTagByKind` (a
`Record<IdentifierKind, ParsedTags>`) is indexed directly rather than built per identifier.

- Strings (`quoteTag`): `string.singleQuote`, `string.doubleQuote`, or bare `string` for anything else.
  Template literal fragments are tagged `string.templateLiteral` directly at their emit site.
- Comments (`commentTag`): `comment.line`, `comment.block`, or `comment.block.doc` for a leading `/**`.
- Identifiers (`identifierTagByKind`): `identifier.<kind>`, where `<kind>` is an `IdentifierKind` -
  `variable`, `property`, `privateProperty`, `type`, `shorthandProperty`, `label`, `importBinding`,
  `exportBinding`.

`tags` is the sole structured output for filtering - e.g. the import/export logic below is implemented in
terms of _not emitting_ certain segments at all, but a consumer with different needs could instead filter on
`tags.identifier` for "any kind of identifier", or on the more specific `tags['identifier.<kind>']` for one
particular kind (see `parser.test.ts`'s `identifierKind` helper, which reads the specific kind back off that
key).

## Import/export handling

`collectImportBindings()` walks the whole tree once, up front, before the main `walk`, building an
`ImportBindings`: `localNames` (every local name an import introduces - aliases, defaults, namespaces, and
unaliased names alike) and `externalNames` (the subset that is _exactly_ the module's own export name,
because the import wasn't renamed). The distinction matters because:

- An unaliased named import's name (`import { expl } from './mod.js'`) is dictated by the external module,
  not authored here - so it's never checked, at its declaration or any later reference to it
  (`externalNames`, checked in the generic identifier path in `walk`).
- A renamed import's local alias, a default import's name, and a namespace import's name are all
  developer-chosen, so they _are_ checked (tagged `importBinding`, handled in the `import_clause` /
  `namespace_import` / `import_specifier` cases).
- Property access through _any_ import-bound name - aliased or not - is external either way
  (`isExternalObject`, used by the `member_expression` case): `myExample.someProp` doesn't check `someProp`,
  since it's not spelling from this file.
- `export_specifier` mirrors this for re-exports (`export { x } from '...'` has the same "external unless
  renamed" shape as an import), but a plain `export { x }` with no `from` clause is just a reference to an
  existing local binding, walked normally.
- A bare module specifier string (`from 'prettier'`, as opposed to `from './mod.js'`) is excluded the same
  way, for the same reason: it's a package name, not something authored here (`isModuleSpecifierString` +
  `isBareModuleSpecifier`, checked in the `'string'` case).
- A module specifier string that _is_ checked (a relative specifier like `from './mod.js'`) additionally gets
  `module.specifier.literal`, plus `.module` appended to its usual quote-style string tag (e.g.
  `string.singleQuote` becomes `string.singleQuote.module`) - so a consumer can filter module specifiers
  independently of ordinary string literals, without losing the plain `string`/`string.singleQuote` tags
  (`quoteTag`'s `isModuleSpecifier` parameter, threaded through from the `'string'` case in `walk`).
- `isModuleSpecifierString` also recognizes a dynamic `import('...')` call's specifier argument
  (`isDynamicImportSpecifier`) - tree-sitter gives that call's callee its own `import` node type, distinct
  from `identifier`, so this can't misfire on some unrelated function that happens to be named `import`. A
  plain `require('...')` call's specifier string isn't tagged `module.specifier.literal` the same way: its
  callee is an ordinary `identifier`, indistinguishable from any other function call by grammar alone, so
  tagging its argument would mean tagging the argument of any 1-arg call named `require` - too broad a net
  for a tag meant to identify the string itself as a module specifier.
- `collectImportBindings` also treats `const x = await import('...')` and `const x = require('...')` like a
  namespace import (`isModuleBindingInitializer`, matched via `variable_declarator`'s `value` field, unwrapping
  one level of `await_expression` first): `x` itself is added to `localNames` (so it's checked, like
  `identifierKindByNodeType`'s plain `identifier` case - no `importBinding` tag, since it's an ordinary
  variable declaration, not import syntax) but never to `externalNames`, so `isExternalObject` still treats
  `x.someProp` as external the same way it would for a real namespace import.

## Shadowing

A local declaration can reuse the exact text of an import name - a parameter, or a `const`/`let`/`var`,
inside a function that also imports a same-named binding. Real JS/TS scoping means the local declaration
wins for the rest of its scope, and `BindingScope` exists to approximate that: a lexical chain of "names
shadowed here", layered on top of the whole-file `ImportBindings`, threaded through `walk`.

Two places push a new `BindingScope` frame:

- A function-like node's own parameters (`functionLikeNodeTypes`, via `parameterNames()`), shadowing for its
  whole body.
- A `statement_block`'s own direct `const`/`let`/`var`/function/class declarations (`blockDeclarationNames()`
  - only _direct_ children, not nested blocks, which get their own frame when `walk` reaches them), shadowing
    for the rest of that block.

`isShadowed()` walks the chain outward; both the external-name check and `isExternalObject` consult it before
deciding something is external. This is intentionally not full lexical scoping: no hoisting, and destructured
binding patterns (`function f({ a, b })`) aren't detected as shadowing names (they still parse correctly,
they just won't shadow an import of the same name).

## Testing

- `parsers.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline. `parseFixture` picks the parser by the fixture's extension, the way
  `recommended` would. A fixture is real, syntactically valid JavaScript or TypeScript content, which
  makes intent easier to read than an escaped string literal, and lets one fixture back several assertions.
  `fixtures/` is excluded from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes -
  quote style, spacing - are frequently what's being asserted on; don't let a formatter "fix" one.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). If you change what the parser excludes or
  includes, a fixture assertion can pass while a sample still fails (or vice versa, if a sample happens not
  to exercise the changed path) - update both when relevant, and run `pnpm test` (not just
  `pnpm run test:vitest`) before considering a change done.

<!-- cspell:ignore expl -->
