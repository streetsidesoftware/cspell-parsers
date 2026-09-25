# TypeScript parser split

The tree-sitter TypeScript backends register one parser, `typescript`, for JavaScript, JSX, TypeScript, and
TSX, and pick the grammar from the filename. That gives the wrong grammar for JSX in a `.js` file, and ignores
the file type a user sets through `languageSettings`. This feature splits them into one parser per file
type, so the grammar follows the parser cspell selects.

## Decisions

| #    | Title                                                        | Status   |
| ---- | ------------------------------------------------------------ | -------- |
| 0001 | Split both tree-sitter backends; `parser-typescript` follows | Accepted |
