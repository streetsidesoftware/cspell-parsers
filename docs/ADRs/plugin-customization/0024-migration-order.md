# 0024. Migrate one package at a time, with the bundle last

Status: Accepted

## Context

[0001](./0001-compatibility-policy.md) requires the repo never to be broken internally, and has `IPluginEx`
and `IParserEx` live alongside `IPlugin` and `IParser` until every package has migrated.
`parser-strings-comments` builds its plugin from nine other packages' plugins, so it can only offer the
builder once each of those parsers is an `IParserEx` with `_parse`
([0020](./0020-parser-exposes-unfiltered-parse.md)).

The options were one PR per package, a single PR for everything, or two PRs (new API, then all packages
plus the fold).

## Decision

The migration happens in this order, each step in its own PR (or a few, for the per-package step):

1. `@internal/utils` gets `IParserEx`, `IPluginEx`, `IPluginBuilder`, the builder's parser class
   ([0018](./0018-builder-parser-class.md)), and `createPluginParserWithFilterTags`
   ([0019](./0019-default-filter-from-tags.md)), with tests. Nothing uses them yet.
2. Each per-language package migrates in its own PR: its parser, its `plugin`, `customizePlugin`
   ([0021](./0021-customize-plugin-wrapper.md)), `recommended`, README, and samples. Until the last one is
   done, the bundle keeps using the old API on them.
3. `parser-strings-comments` migrates, including its deprecated `(fileType, options)` overload and the
   replacement of its file-type `getParser` ([0023](./0023-parser-carries-filter-and-get-parser.md)).
4. `IPluginEx`/`IParserEx` are folded into `IPlugin`/`IParser`, and the old API (`createPluginParser`,
   `customizeParser`, `customizeParserPlugin`, `PluginParserImpl`) is removed.

## Consequences

- Each PR is small and can be checked end to end on its own package's samples with
  `pnpm cspell check --json`.
- Between steps 1 and 4, the old and new APIs are both live in `@internal/utils`, and its prebuilt
  `dist/index.d.ts` has to be rebuilt whenever its exported types change.
- dist size is checked per PR, since each package's `dist/*.d.ts` inlines whatever it imports from
  `@internal/utils`.
