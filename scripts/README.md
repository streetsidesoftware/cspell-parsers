# Repo Scripts

These scripts are used to help maintain the repo.

- `fix-release-please-config.ts` keeps the `release-please-config.json` file up to date when packages are added.
- `fix-package-json.ts` lints and fixes any `packages/*/package.json` issues.
- `fix-parser-readme.ts` regenerates the CSV tables the READMEs inject, so they're generated from code rather
  than hand-copied from it. Run `pnpm run build:readme` afterward to actually inject them into each
  `README.md`.
  - `docs/tags-table.csv` comes from `src/tags.ts`'s `tagsAndMeaning` export (packages that don't export one
    are skipped). It's injected with `inject-markdown`'s `#markdown` option
    (`<!--- @@inject: docs/tags-table.csv#markdown --->`) so the backtick-wrapped tag names and inline code in
    `Meaning` render as code spans instead of literal text.
    A package without its own `tagsAndMeaning` that bundles workspace parsers which have one (a `workspace:`
    `dependencies` entry, e.g. `@cspell/parser-strings-comments`) gets a merged `Tag,Meaning,Languages` table
    instead, with one row per distinct meaning of each tag. It reads each bundled parser's built
    `dist/plugin.js` for its languages, so run `pnpm run build` first.
  - `docs/language-id-n-parser-name.csv` comes from `dist/plugin.js`'s `plugin.parsers`, so run
    `pnpm run build` first. It has one row per language ID/parser pair, sorted by language ID and then by
    parser order, and marks the last parser for each language ID as `Recommended`.
  - `static/packages.csv` (for the root `README.md`) comes from the `name` of every non-private
    `packages/*/package.json`, sorted by name, plus that package's built `dist/plugin.js` (run
    `pnpm run build` first; packages without one are skipped) - its `Languages` column is the union of every
    parser's `supportedFileTypes`, and its `Tags` column is the deduped first `.`-segment of every tag its
    parsers emit _by default_ (e.g. `comment.block.doc` -> `comment`) - each parser's `tags` map marks which
    of its tags are on by default, so the catch-all `code` tag (off by default) is excluded without special-
    casing its name. Like the tags table, it's injected with `#markdown` so each package name renders as a
    link to its directory and each language/tag renders as a code span.
  - `docs/tags.csv` (for `docs/tags.md`) merges every package's `src/tags.ts` into one `Tag,Meaning,Packages`
    table, with a row per distinct meaning of each tag, and `all` when every package uses that meaning.

All three scripts accept a `--dry-run` flag that reports what would change (via stderr) and exits with a
non-zero status if a fix is needed, without writing anything. `pnpm run lint` runs all three in fixing mode
before `eslint`/`prettier`; `pnpm run lint-ci` runs all three with `--dry-run` so CI fails if a package.json,
`release-please-config.json`, or a generated `.csv` table is out of date.
