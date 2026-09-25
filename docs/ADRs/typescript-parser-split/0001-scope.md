# 0001. Split both tree-sitter backends; `parser-typescript` follows

Status: Accepted

## Context

`@cspell/parser-typescript-tree-sitter` (native) and `@cspell/parser-typescript-tree-sitter-wasm` each
register one parser, `typescript`, for `javascript`, `javascriptreact`, `typescript`, and `typescriptreact`.
The grammar is chosen from the filename: `.tsx` and `.jsx` get the TSX grammar, everything else the
TypeScript grammar. cspell never tells a parser its file type
([plugin-customization/0001](../plugin-customization/0001-design-principles.md)), so:

- JSX in a `.js` file, common in React projects, is parsed with the TypeScript grammar;
- a file a user maps to `javascriptreact` through `languageSettings` or `overrides` still follows its
  extension.

`@cspell/parser-typescript` re-exports the WASM backend. `@cspell/parser-javascript` wraps
`parser-typescript`'s `parse` as a parser named `javascript`, for `javascript` and `javascriptreact`.

## Decision

The split covers both tree-sitter backends. `parser-typescript` follows automatically, since it re-exports the
WASM backend. `parser-javascript` is decided separately, because a split plugin also has a JavaScript parser.

## Consequences

- The two backends stay drop-in replacements for each other, as today.
- `parser-typescript` needs no design of its own, only its README and tests updated.
