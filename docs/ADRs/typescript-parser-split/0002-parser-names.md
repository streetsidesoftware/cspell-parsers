# 0002. One parser per file type, named after the file type

Status: Accepted

## Context

A parser is selected only by name, and the last parser registered under a name wins
([plugin-customization/0001](../plugin-customization/0001-design-principles.md)). Names are public API.
Two schemes were weighed:

- the file-type IDs users already write: `typescript`, `typescriptreact`, `javascript`, `javascriptreact`;
- names prefixed with the package, such as `typescript-tsx` and `typescript-js`, which avoid overlapping
  `@cspell/parser-javascript`'s `javascript` parser but are new names to learn.

## Decision

Each backend's plugin has four parsers, each listing only its own file type:

| Parser            | File type         |
| ----------------- | ----------------- |
| `javascript`      | `javascript`      |
| `javascriptreact` | `javascriptreact` |
| `typescript`      | `typescript`      |
| `typescriptreact` | `typescriptreact` |

## Consequences

- `typescript` keeps its name, so configs that select it keep working. A config that also sends JavaScript
  files to `typescript` still works, since file types don't restrict a parser, but those files get the
  TypeScript grammar. The README should point such users at the new parsers.
- `javascript` is also `@cspell/parser-javascript`'s parser name, so loading both plugins makes one replace
  the other by order. How that package relates to the split is decided separately.
- `recommended` maps each file type to its own parser.
