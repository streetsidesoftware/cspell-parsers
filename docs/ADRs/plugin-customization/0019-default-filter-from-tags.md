# 0019. A parser's default filter comes only from its `tags`

Status: Accepted

## Context

Today every package creates its parser with `createPluginParser(options, filter?)`, where `filter` is an
arbitrary function. For example, `parser-typescript-tree-sitter-wasm` passes `(p) => p.tags !== TAGS.CODE`.
An opaque function sits between the builder and the parser's real output, so the builder can't recompile
the author's default the way [0012](./0012-filter-tags-replaces.md) needs.

## Decision

Every package moves to a new factory, `createPluginParserWithFilterTags(options)`. It takes no filter
argument, and `options.tags` is required. A parser's default filter is derived entirely from its `tags`,
where each tag's boolean says whether that tag is emitted by default.

## Consequences

- An author's default behavior is plain data that the builder can always recompile.
- An author who wants something off by default (e.g. `code`) sets that tag to `false` in `tags`, instead of
  writing a filter function.
- `createPluginParser` and its `filter` argument go away once every package has migrated
  ([0001](./0001-compatibility-policy.md)).
