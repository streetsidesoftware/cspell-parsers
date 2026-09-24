# 0003. A duplicated parser is appended to the end of the plugin's parsers

Status: Accepted

## Context

Per [0002](./0002-parsers-own-file-types.md), the recommended parser for a file type is the last parser
in the plugin's `parsers` order that lists it, so where a new parser lands in that order matters.
Duplicating a parser (a copy under a new name) is the operation that adds one. The copy starts with the
same file types as the original, so its position decides which of the two `recommended` selects.

Options considered: append the copy at the end (the copy takes over the shared file types), insert it
before the original (the original keeps them), or let the caller choose the position.

## Decision

We will append a duplicated parser to the end of the plugin's `parsers`.

## Consequences

- Duplicating a parser means "switch `recommended` to this variant" for every file type it shares with
  the original, which fits the main use case (for example, a `-comments-only` variant).
- To keep the original as the recommended parser for some file types, remove those file types from the
  duplicate.
- There is no position option. If one turns out to be needed later, it can be added with append as the
  default without breaking existing callers.
