# 0020. `IParser` exposes its unfiltered parse as `_parse`

Status: Accepted

## Context

A parser's `parse`, the function cspell calls, has the author's default filter applied
([0019](./0019-default-filter-from-tags.md)), so segments with tags that are off by default (e.g. `code`)
never come out of it. The builder's parser class ([0018](./0018-builder-parser-class.md)) has to compile
filters against the unfiltered output. Private fields can't carry it across packages, because each package
bundles its own copy of `@internal/utils`. `parser-strings-comments`, for one, builds its plugin from
other packages' parsers.

The options were a public field on `IParser`, or a hidden `Symbol.for` key.

## Decision

`IParser` has a public `_parse` member: the parser's unfiltered parse function, before any tag filter is
applied. `parse` stays the filtered function that cspell calls.

## Consequences

- A builder in any package can recompile a filter against any parser's original output, so a tag that's
  off by default can always be turned on.
- The leading underscore marks `_parse` as plumbing for builders, not something a user calls. It is still
  part of `IParser`'s public type.
- `parseDocument` isn't supported yet ([0017](./0017-parser-is-read-only.md)), so it has no unfiltered
  counterpart.
