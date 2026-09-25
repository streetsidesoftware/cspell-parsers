# 0006. Tag filters replace, never chain; defaults come only from `tags`

Status: Accepted

## Context

If each filter wrapped the previous one, a later filter could only narrow what earlier ones allowed, and a
tag that's off by default (such as `code`) could never be turned back on. That requires every filter,
including the author's default, to be recompiled from the parser's unfiltered output. Today each
package passes `createPluginParser` an arbitrary filter function, e.g. `(p) => p.tags !== TAGS.CODE`, which a
builder can't recompile.

Successive `filterTags` calls on one parser could replace the previous options, or merge new keys over them.
Merging reads well in a chain, but the effective filter then depends on every earlier call, including `'*'`
calls further up.

## Decision

- Every package creates its parsers with `createPluginParserWithFilterTags(options)`. It takes no filter
  argument, and `options.tags` is required. Each tag's boolean says whether it's checked by default, so the
  author's defaults are plain data.
- Filters never chain. Every filter is compiled against the parser's unfiltered output and its `tags`.
- `filterTags(target, options)` replaces the filter on each targeted parser. After the call, that parser's
  filter is exactly `options`, and earlier calls, `'*'` ones included, no longer affect it.

```js
custom
  .filterTags('*', { '*': false, comment: true })
  .filterTags('typescript', { '*': false, comment: true, string: true }); // the whole filter, not a delta
```

## Consequences

- Any tag can always be turned on or off, however the parser was customized before.
- A parser's effective filter is the last `filterTags` call that targeted it.
- Adding one tag to an existing filter means restating the whole filter. `filterTags(target, {})` resets to
  the author's defaults.
- Authors set noisy tags such as `code` to `false` in `tags` instead of writing a filter function.
