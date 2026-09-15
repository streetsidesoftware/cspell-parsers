# Contributing to @cspell/parser-typescript

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) — this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

`parse(content, filename)` parses `content` with [tree-sitter](https://tree-sitter.github.io/tree-sitter/)
(`.tsx`/`.jsx` files use the `tsx` grammar, everything else the plain `typescript` grammar - see `isTsx`),
then makes a single pass over the whole AST (`walk`), emitting one `ParsedText` per spell-checkable leaf. A
"leaf" is:

- an identifier of some kind (variable/property/type/label/...),
- a string or template literal fragment,
- a comment,
- non-blank JSX text.

Everything else - keywords, punctuation, numeric literals, and any node type not covered above - contributes
nothing to the output. Since cspell only ever checks what's inside `parsedTexts`, this is how the parser
excludes syntax noise: by simply never emitting it, not by filtering it out afterwards.

`walk` takes four things down through the recursion, alongside the current AST node:

- `scope: ScopeChain | undefined` - the TextMate-style scope chain (see below).
- `bindingScope: BindingScope | undefined` - the shadowing chain (see below).
- `ctx: WalkContext` - constant for the whole parse: `{ imports, tsxMode }`.
- `out: ParsedText[]` - the accumulator.

Most node types fall through to the generic handling at the bottom of `walk` (compute a container scope,
recurse into `namedChildren`); a `switch` at the top special-cases node types that need different treatment:
comments, strings, template literals, JSX text, `statement_block` (for shadowing), and everything
import/export/member-access related.

## The scope model

Every emitted segment carries a `scope`: a `ScopeChain` built to look like what a TextMate grammar would
assign the same token - dotted, `.ts`/`.tsx`-suffixed category names (`meta.class.ts`,
`entity.name.function.ts`, `string.quoted.single.ts`, ...), local to global, never the source text itself.

Three lookup tables drive this:

- `containerScopeByNodeType` - the scope pushed for the _contents_ of a node that introduces a named
  construct (a class body gets `meta.class.ts`, an arrow function's parameters/body get `meta.arrow.ts`,
  ...). A node qualifies either by being explicitly listed here, or - via `genericContainerScope` - by having
  a `name`/`pattern` field at all (see "Declaration names", below).
- `declarationNameScopeByNodeType` - a more specific scope for a construct's _own name_, when the real
  grammar would use one (a class name gets `entity.name.type.class.ts`, not just its generic identifier
  scope).
- `identifierScopeByKind` - the fallback scope for a bare identifier leaf, keyed by `IdentifierKind`.

These names were checked against the real
[`TypeScript.YAML-tmLanguage`](https://github.com/microsoft/TypeScript-TmLanguage) grammar (search that repo
for the exact scope name to verify one), but this is an approximation, not a byte-for-byte reproduction, in
two known ways:

- A real grammar stacks several scope names onto one token (e.g. a class field name is
  `meta.definition.property.ts variable.object.property.ts`). This parser only ever contributes one name per
  chain level.
- Property-ish identifiers - object literal keys, class fields, interface members, and `a.b` property access
  - each get their own distinct scope for real. This parser collapses all of them to
    `variable.other.property.ts`, which is the real scope for the property-access case specifically.

`forFileKind` swaps a scope name's `.ts` suffix for `.tsx` when parsing a TSX file - this happens once, in
`scoped()`, rather than needing every table entry duplicated per file kind.

### Declaration names

A node's own "name" isn't always under a `name` field: `required_parameter`/`optional_parameter` list `name`
as a possible grammar field, but for a plain identifier parameter the identifier actually comes through under
`pattern` instead - `name` is `null`. `declarationNameNode()` tries `name` first and falls back to `pattern`.
This bit two things before it was fixed: the parameter's own declaration path, and shadowing detection (see
below) - `parameterNames()` silently found nothing for _any_ function until this fallback was added, because
it was reading a field that was always empty. If a lookup for a node's name ever seems to silently fail,
suspect this field first.

## Tags

Each segment also carries `tags`, independent of `scope`. A tag is a dot-separated hierarchical name used
as the key of the `ParsedTags` object, with `true` as its value (e.g. `'comment.block.doc': true`), not a
category-name key holding a subtype string - this is what lets cspell's `validate`/`ValidationTags` setting
(see `CSpellSettingsValidation` in `@cspell/cspell-types`) match a broad key like `comment.block` against a
more specific tag like `comment.block.doc`.

`hierarchicalTags(tag)` builds the whole ancestor chain for a dotted tag - e.g.
`hierarchicalTags('comment.block.doc')` is `{ comment: true, 'comment.block': true, 'comment.block.doc':
true }` - so every leaf's `tags` object carries all of its ancestors, not just the most specific segment.
This is deliberate even though a config's `validate` setting matches by dotted-prefix on its own: emitting
the whole chain means a consumer can filter on `tags.comment` directly too, without needing its own
prefix-matching logic just to ask "is this any kind of comment?"

The set of possible tags is fixed and known ahead of time, so `hierarchicalTags` is only ever called at
module load time, to build module-level constants (`STRING_SINGLE_QUOTE_TAG`, `COMMENT_BLOCK_DOC_TAG`,
`identifierTagByKind.property`, ...) - never per emitted segment. `emit()` runs once per spell-checkable
leaf in the file, so `quoteTag`/`commentTag` return one of a handful of shared constants rather than
allocating a fresh object every call, and `identifierTag` was replaced entirely by `identifierTagByKind`, a
`Record<IdentifierKind, ParsedTags>` indexed directly (mirroring `identifierScopeByKind`).

- Strings (`quoteTag`): `string.singleQuote`, `string.doubleQuote`, or bare `string` for anything else.
  Template literal fragments are tagged `string.templateLiteral` directly at their emit site.
- Comments (`commentTag`): `comment.line`, `comment.block`, or `comment.block.doc` for a leading `/**` -
  this now matches the distinction `commentScope` already made for `scope`
  (`comment.block.documentation.ts`).
- Identifiers (`identifierTagByKind`): `identifier.<kind>`, where `<kind>` is an `IdentifierKind` -
  `variable`, `property`, `privateProperty`, `type`, `shorthandProperty`, `label`, `importBinding`,
  `exportBinding`.

`scope` is presentational (modeled on a real grammar's output); `tags` is the structured field meant for
programmatic filtering - e.g. the import/export logic below is implemented in terms of _not emitting_
certain segments at all, but a consumer with different needs could instead filter on `tags.identifier` for
"any kind of identifier", or on the more specific `tags['identifier.<kind>']` for one particular kind (see
`parser.test.ts`'s `identifierKind` helper, which reads the specific kind back off that key).

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

## Shadowing

A local declaration can reuse the exact text of an import name - a parameter, or a `const`/`let`/`var`,
inside a function that also imports a same-named binding. Real JS/TS scoping means the local declaration
wins for the rest of its scope, and `BindingScope` exists to approximate that: a lexical chain of "names
shadowed here", layered on top of the whole-file `ImportBindings`, threaded through `walk` alongside `scope`.

Two places push a new `BindingScope` frame:

- A function-like node's own parameters (`functionLikeNodeTypes`, via `parameterNames()`), shadowing for its
  whole body.
- A `statement_block`'s own direct `const`/`let`/`var`/function/class declarations (`blockDeclarationNames()`
  - only _direct_ children, not nested blocks, which get their own frame when `walk` reaches them), shadowing
    for the rest of that block.

`isShadowed()` walks the chain outward; both the external-name check and `isExternalObject` consult it before
deciding something is external. This is intentionally not full lexical scoping: no hoisting, and destructured
binding patterns (`function f({ a, b })`) are simply not detected as shadowing names (they still parse
correctly, they just won't shadow an import of the same name).

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid (TypeScript-shaped) content, which
  makes intent easier to read than an escaped string literal, and lets one fixture back several assertions.
  `fixtures/` is excluded from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes -
  quote style, spacing - are frequently what's being asserted on; don't let a formatter "fix" one.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). If you change what the parser excludes or
  includes, a fixture assertion can pass while a sample still fails (or vice versa, if a sample happens not
  to exercise the changed path) - update both when relevant, and run `pnpm test` (not just
  `pnpm run test:vitest`) before considering a change done.

<!-- cspell:ignore expl -->
