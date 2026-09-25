# 0012. `filterTags` replaces a parser's filter; filters are never chained

Status: Accepted

## Context

A parser can be filtered more than once in a chain, e.g. `filterTags('*', …)` followed by
`filterTags('typescript', …)`. If filters were chained, with each one wrapping the previous, a later filter
could only narrow what earlier ones allowed, and a tag that's off by default (such as `code`) could never be
turned back on. The existing `customize()` in `@internal/utils` already avoids this. It compiles a new filter
against the parser's original output and default tags, and never wraps the previous one.

What was still open was how successive option objects combine: replace the previous options, or merge the
new keys over them.

## Decision

Filters are never chained. Every filter is compiled against the parser's original output and its default
tags.

`filterTags(target, options)` replaces the filter on each targeted parser. After the call, that parser's
filter is exactly `options`, and earlier `filterTags` calls, including `'*'` ones, no longer affect it.

```js
custom
  .filterTags('*', { '*': false, comment: true })
  .filterTags('typescript', { '*': false, comment: true, string: true }); // the whole filter, not a delta
```

## Consequences

- A parser's effective filter can be read from the last `filterTags` call that targeted it. No need to
  replay the chain.
- Adding one tag to an existing filter means restating the whole filter.
- `filterTags(target, {})` resets a parser to its default tags.
