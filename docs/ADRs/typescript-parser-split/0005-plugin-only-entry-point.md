# 0005. The plugin is the only entry point; the `./parser` subpath is removed

Status: Accepted, amended (see [Amendment](#amendment-every-package-uses-parsersts-and-no-parser))

## Context

Each package's `./parser` subpath exports one `parser` (named `typescript`), its `parse`,
`supportedFileTypes`, and `createParser`. With four parsers ([0002](./0002-parser-names.md)), a single
`parser` no longer describes the package. Keeping these exports, deprecated, would only serve compatibility,
and nobody is known to use them yet. Breaking changes ship as a minor release
([plugin-customization/0002](../plugin-customization/0002-compatibility-and-migration.md)).

## Decision

The `./parser` subpath is removed from both backends and from `parser-typescript`, along with `parser`,
`parse`, `createParser`, and the package-level `supportedFileTypes` export. Everything goes through `plugin`:
`plugin.getParser(name)`, `plugin.supportedFileTypes`, `customizePlugin()`, and `defineConfig()`. The `./tags`
subpath stays.

## Consequences

- This is an exception to the package shape in `CLAUDE.md`, which says every package has `./parser`. The
  package-shape docs must say so for multi-parser packages.
- `parser-javascript` builds its plugin from `parser-typescript`'s plugin
  ([0004](./0004-parser-javascript.md)).
- Code that imported `@cspell/parser-typescript/parser` breaks, and the release notes say what replaces each
  export.

## Amendment: every package uses `parsers.ts` and no `./parser`

This decision first covered only the TypeScript packages, so the package shape had two forms: one-parser
packages kept `src/parser.ts` and a `./parser` subpath, while packages with more than one parser used
`src/parsers.ts` and no subpath. Two forms meant two templates to copy and two sets of docs to keep in sync.

Now every parser package keeps its parsers in an internal `src/parsers.ts` that exports a `parsers` array,
even when there is only one parser, and no package publishes `./parser`. The plugin is the only entry point:
`plugin.getParser(name)`. The `./parser` subpath was experimental, so removing it from the remaining
packages is not a breaking change.
