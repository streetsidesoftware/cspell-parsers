# 0014. A renamed parser keeps its position

Status: Accepted

## Context

The order of a plugin's `parsers` decides which parser `recommended` and `languageSettings()` pick for a
shared file type ([0002](./0002-parsers-own-file-types.md)). A rename could keep the parser where it is, or
move it to the end, as a duplicate would ([0003](./0003-duplicate-appends.md)). Moving it would change which
parser handles a shared file type as a side effect of changing a name.

## Decision

`renameParser(name, newName)` changes only the name. The parser keeps its position, file types, and filter.
A rename onto an existing name throws ([0009](./0009-name-collision-throws.md)).

## Consequences

- A rename never changes which parser handles a file type.
- To rename and move a parser to the end, the user writes it explicitly: `duplicateParser(name, newName)`,
  then `removeParser(name)`.
