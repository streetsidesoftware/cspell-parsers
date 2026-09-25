# 0003. Each parser uses its own grammar; JavaScript uses the JavaScript grammar

Status: Accepted

## Context

Today the grammar is chosen from the filename. Once each parser has one file type, the parser can choose.
VS Code gives `.js` files the `javascript` file type even when they contain JSX, so the `javascript` parser
must handle JSX.

Measured with the WASM backend on about 2 MB of JavaScript:

| Grammar    | Size    | Load | Parse  | JSX in `.js` | `a < b > (c)`  |
| ---------- | ------- | ---- | ------ | ------------ | -------------- |
| JavaScript | 402 KB  | 2 ms | 166 ms | ok           | comparison     |
| TypeScript | 1381 KB | 3 ms | 171 ms | error        | a generic call |
| TSX        | 1412 KB | 3 ms | 172 ms | ok           | a generic call |

Speed is the same. The TypeScript grammar can't parse JSX. The TSX grammar misreads a rare comparison as a
generic call, which changes a tag but not what's checked.

## Decision

| Parser            | Grammar    |
| ----------------- | ---------- |
| `javascript`      | JavaScript |
| `javascriptreact` | JavaScript |
| `typescript`      | TypeScript |
| `typescriptreact` | TSX        |

The filename no longer affects the grammar.

## Consequences

- JSX in a `.js` file parses correctly, and a file mapped to a file type through `languageSettings` or
  `overrides` gets that file type's grammar.
- The WASM backend already ships `tree-sitter-javascript.wasm`. The native backend adds
  `tree-sitter-javascript` as a direct dependency. It's already installed, as a dependency of
  `tree-sitter-typescript`.
- The tree walk must be checked against the JavaScript grammar's node types, and tests need JavaScript and
  JSX fixtures parsed by the JavaScript grammar.
- A `.ts` file sent to `typescriptreact`, or the other way round, now gets that parser's grammar, as the user
  asked.
