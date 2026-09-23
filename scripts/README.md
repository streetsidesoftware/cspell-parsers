# Repo Scripts

These scripts are used to help maintain the repo.

- `fix-release-please-config.ts` keeps the `release-please-config.json` file up to date when packages are added.
- `fix-package-json.ts` lints and fixes any `packages/*/package.json` issues.
- `fix-parser-readme.ts` regenerates the CSV tables each package's README injects, so they're generated from
  code rather than hand-copied from it. Run `pnpm run build:readme` afterward to actually inject them into
  that package's `README.md`.
  - `docs/tags-table.csv` comes from `src/tags.ts`'s `tagsAndMeaning` export (packages that don't export one
    are skipped). It's injected with `inject-markdown`'s `#markdown` option
    (`<!--- @@inject: docs/tags-table.csv#markdown --->`) so the backtick-wrapped tag names and inline code in
    `Meaning` render as code spans instead of literal text.
  - `docs/language-id-n-parser-name.csv` comes from `dist/plugin.js`'s `plugin.parsers`, so run
    `pnpm run build` first. It has one row per language ID/parser pair, sorted by language ID and then by
    parser order, and marks the last parser for each language ID as `Recommended`.

All three scripts accept a `--dry-run` flag that reports what would change (via stderr) and exits with a
non-zero status if a fix is needed, without writing anything. `pnpm run lint` runs all three in fixing mode
before `eslint`/`prettier`; `pnpm run lint-ci` runs all three with `--dry-run` so CI fails if a package.json,
`release-please-config.json`, or a generated `docs/*.csv` table is out of date.
