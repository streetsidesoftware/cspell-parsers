# 0006. Two PRs, each moving to `IPluginEx` and splitting at once

Status: Accepted

## Context

A plugin with several parsers needs the `IPluginEx` API (`customizePlugin`, `defineConfig`, `getParser`), so
the move to it and the split go together. `@cspell/parser-typescript` re-exports the WASM backend, and
`@cspell/parser-javascript` builds on `parser-typescript`, so removing `./parser`
([0005](./0005-plugin-only-entry-point.md)) breaks both unless they change in the same PR. The native backend
is independent. `main` must never be broken
([plugin-customization/0002](../plugin-customization/0002-compatibility-and-migration.md)).

## Decision

1. **WASM PR:** `parser-typescript-tree-sitter-wasm`, `parser-typescript`, and `parser-javascript` move to
   `IPluginEx` and split, with samples, READMEs, and tests.
2. **Native PR:** `parser-typescript-tree-sitter`, in the same shape.

Each is mergeable on its own, and each ships as a minor release.

## Consequences

- Until the native PR lands, the two backends differ, so they aren't drop-in replacements for each other
  between the two merges.
- Samples cover JSX in a `.js` file, and each special case in the READMEs links to its test.
