# 0002. Breaking externally is allowed; the repo is never broken internally

Status: Accepted, amended (see [Amendment](#amendment-the-ex-names-are-folded))

## Context

Every published package's `customizePlugin` sits on `@internal/utils`, so reshaping the plugin and parser
types changes each package's public API. The packages have few users, so strict compatibility isn't worth a
worse design. Inside the repo, though, packages depend on each other: `parser-typescript` on
`parser-typescript-tree-sitter-wasm`, `parser-javascript` on `parser-typescript`, and
`parser-strings-comments` bundles nine other packages' plugins.

The migration could be one PR per package, one PR for everything, or two PRs (new API, then all packages).

## Decision

Breaking changes to the customization API ship as a **minor** release. Commits use `feat:`, never `feat!:`,
since a `!` makes release-please do a major bump. The break is described in the commit body and PR.

Every commit keeps every package building, type-checking, and passing tests. The new types (`IPluginEx`,
`IParserEx`, `IPluginBuilder`) live alongside `IPlugin`/`IParser` until every package has migrated, in this
order, each step in its own PR (or a few):

1. `@internal/utils` gets the new types, the builder, its parser class, and
   `createPluginParserWithFilterTags`, with tests.
2. Each per-language package migrates: parser, `plugin`, `customizePlugin`, `recommended`, README, samples.
   The bundle keeps using the old API on them meanwhile.
3. `parser-strings-comments` migrates, since it needs every bundled parser to be an `IParserEx`.
4. The new types are folded back into `IPlugin`/`IParser`, and the old API (`createPluginParser`,
   `customizeParser`, `customizeParserPlugin`, `PluginParserImpl`) is removed.

## Consequences

- Each PR is small and can be checked end to end on its package's samples with `pnpm cspell check --json`.
- Between steps 1 and 4, both APIs are live, and `@internal/utils`' prebuilt `dist/index.d.ts` must be
  rebuilt whenever its exported types change. dist size is checked per PR.
- `CONTRIBUTING.md`'s step-by-step package instructions describe the old API and are updated during the
  migration.

## Amendment: the `Ex` names are folded

Step 4 is done. The old API was removed first, and then the new names dropped their `Ex` suffix:

- `IPluginEx` became `IPlugin`, and `IPluginExBase` was merged into it.
- `IParserEx` became `IParser`.
- `createPluginEx` became `createPlugin`, and `CustomizePluginExOptions` became `CustomizePluginOptions`.
- `customizePluginEx` became `customizePluginWith`, since each package already exports its own `customizePlugin`.

`IPluginBuilder` and the `filterTags` field keep their provisional names until issue #169 settles them.
