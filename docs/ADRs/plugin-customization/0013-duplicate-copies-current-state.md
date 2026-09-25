# 0013. `duplicateParser` copies the original's current state

Status: Accepted

## Context

A parser can carry a filter ([0012](./0012-filter-tags-replaces.md)) and changed file types by the time it
is duplicated. The options were: the duplicate copies the original as it is at that point in the chain, or
it copies the parser as the author shipped it (the author's file types and default filter).

## Decision

`duplicateParser(name, newName)` copies the original's current state (its file types and its filter) at
that point in the chain. The copy differs only in its name, and it is appended to the end of the plugin's
parsers ([0003](./0003-duplicate-appends.md)).

## Consequences

- A duplicate always behaves exactly like its original did at the moment it was made.
- Where `duplicateParser` sits in the chain matters: changes made to the original before it are copied,
  and changes made after it are not. This is consistent with the chain being ordered by design
  ([0004](./0004-chained-immutable-methods.md)).
- To start a duplicate from the author's defaults, the user duplicates before customizing the original, or
  resets the copy with `filterTags(newName, {})` and `setFileTypes`.
