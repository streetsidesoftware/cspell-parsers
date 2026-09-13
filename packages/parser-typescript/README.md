# @cspell/parser-typescript

A cspell [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) for TypeScript (`.ts`/`.mts`/`.cts`)
and TSX (`.tsx`/`.jsx`) source files, built on [tree-sitter](https://tree-sitter.github.io/tree-sitter/) and
[`tree-sitter-typescript`](https://github.com/tree-sitter/tree-sitter-typescript).

Rather than spell checking the raw source text, it parses a full AST and only emits `ParsedText` for the
parts of the code that are actually meant to be read as words: identifiers, string/template literal
contents, comments, and JSX text. Keywords, punctuation, and numeric literals are left out entirely.

Each `ParsedText` segment also carries:

- **`tags`** — metadata about the segment. Strings/comments are tagged with their syntax, e.g.
  `{ string: 'singleQuote' }`, `{ string: 'doubleQuote' }`, `{ string: 'templateLiteral' }`,
  `{ comment: 'line' }`, `{ comment: 'block' }`. Identifiers are tagged with the kind of name they are, e.g.
  `{ identifier: 'variable' }`, `{ identifier: 'property' }`, `{ identifier: 'type' }`,
  `{ identifier: 'importBinding' }`, `{ identifier: 'exportBinding' }`.
- **`scope`** — a `ScopeChain` in the style of a TextMate grammar's scope stack: dotted, `.ts`/`.tsx`-suffixed
  category names (`meta.class.ts`, `entity.name.function.ts`, `string.quoted.single.ts`, ...) describing what
  *kind* of construct a segment sits inside, ordered local to global — never the source text itself, so a
  class named `Foo` and one named `Bar` get the same scope shape. For example, a string returned from a
  method inside a class gets the scope chain `string.quoted.single.ts` → `meta.method.declaration.ts` →
  `meta.class.ts` → `source.ts`. These names approximate common TextMate/VS Code grammar conventions for
  TypeScript; they aren't copied from any specific grammar.

Import/export bindings get special treatment: a named import's original module-exported name (e.g. `expl` in
`import { expl } from './mod.js'`) is never checked, at its declaration or anywhere it's referenced, since
it's dictated by the external module rather than authored in this file. A renamed import's local alias
(`myExample` in `import { expl as myExample } from './mod.js'`) *is* checked, since the author chose that
name — but properties accessed off it (`myExample.someProp`) are not, since they belong to the external
module's shape, not this file.

## Usage

```jsonc
{
  "plugins": ["@cspell/parser-typescript"],
  "parser": "typescript-tree-sitter",
}
```

## Notes

- This package depends on a pre-release `@cspell/cspell-types` (`10.3.2-alpha.0`) because `ParsedText.tags`
  hasn't shipped in a stable release yet. Bump it to a stable version once one is published.
- `tree-sitter`/`tree-sitter-typescript` ship native addons; the pinned versions (`tree-sitter@^0.21.1`,
  `tree-sitter-typescript@^0.23.2`) are chosen to match `tree-sitter-typescript`'s declared `tree-sitter` peer
  range and avoid ABI mismatches between the two.
