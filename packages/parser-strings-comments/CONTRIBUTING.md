# Contributing to @cspell/parser-strings-comments

This package has no parser of its own. It combines the plugins of this repo's per-language strings-and-comments
packages into one plugin, so a single import covers every language they support. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape.

## Shape of the plugin

`src/plugin.ts` builds `plugin` with `@internal/utils`'s `createPluginEx`, from the parsers of every bundled
plugin, in order. Each language package keeps its own parser name, so the bundle's parser names are the same as
the packages' (`php-strings-comments`, ...), and a parser's file types, tags, and default filter come along
unchanged. Parser names must stay unique across the bundled packages: `createPluginEx` throws on a duplicate.

To bundle a new language package:

1. Add it to `dependencies` in `package.json`, as `workspace:*`.
2. Import its `plugin` in `src/plugin.ts` and add it to `bundledPlugins`.
3. Run `pnpm run build && pnpm run build:readme` to regenerate the README's Supported file types and Tags
   tables.
4. Add a row for it to the README's table of per-language packages.

## `customizePlugin`

`customizePlugin(options?)` is a thin wrapper around `customizePluginEx`, the same as in every language package.
Its deprecated `(fileType, options)` form reproduces the old bundle's result: it keeps only the parsers that list
`fileType`, narrows them to `fileType`, renames them to `options.name`, and applies `options.tags`. With `'*'`, it
keeps every parser and names only the plugin. See `docs/ADRs/plugin-customization/0008-customize-plugin-wrapper.md`.

## Testing

- `src/plugin.test.ts` checks that every bundled parser is present, in order, and that both forms of
  `customizePlugin` filter and narrow as described above. Parsing itself is tested in each language package.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real by
  `pnpm run test:cspell` (`cspell .` from the package root). `samples/comments` and `samples/customize` each hold
  a genuine misspelling in a segment their filter excludes. Check them both ways: run cspell with the sample's
  config and with `plugin.defineConfig()`, each with `--no-config-search`, so the sample's own config doesn't
  apply to both runs.
- Every sample `.php` file starts with `<?php` and never closes it, so no HTML segments reach the spell checker.
