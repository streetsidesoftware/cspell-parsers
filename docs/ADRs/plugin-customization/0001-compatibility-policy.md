# 0001. Compatibility policy: breaking externally, never internally

Status: Accepted

## Context

`IPlugin`, `IParser`, `customizeParser`, and `customizeParserPlugin` in `@internal/utils` weren't designed
up front — they accreted as parser packages were added and hit scaling/consistency problems. Every
published `@cspell/parser-*` package's `customizePlugin` sits on top of them, so reshaping them changes
each package's public API.

The published packages have very few users, so strict semver compatibility for their customization API
isn't worth preserving at the cost of a clean design. The repo itself is a different matter: packages
depend on each other (`parser-typescript` → `parser-typescript-tree-sitter-wasm`, `parser-javascript` →
`parser-typescript`, `parser-strings-comments` bundling the others), and all of them build against
`@internal/utils`.

## Decision

We will allow breaking changes to the published customization API (`customizePlugin`, its options, and
the plugin/parser shapes it exposes) and release them as a minor update. These commits do **not** carry a `!` in their Conventional Commit type
(`feat:`, not `feat!:`), because a `!` makes release-please do a major bump. The breaking change is
described in the commit body/PR description instead.

We will never leave the repo internally broken: every commit keeps every package building, type-checking,
passing tests, and passing `test:cspell` against the others. `IPluginEx` is introduced alongside `IPlugin`
so packages can migrate one at a time. `IPluginEx` is folded back into `IPlugin` only after every package
has moved over.

## Consequences

- Designs can drop awkward pieces of the current API instead of shimming them.
- The migration is incremental: while it's in progress, both `IPlugin` and `IPluginEx` must coexist in
  `@internal/utils`, and any cross-package consumer (e.g. `parser-strings-comments`) must accept both.
- The eventual fold of `IPluginEx` into `IPlugin` is its own step, gated on all packages being migrated.
