# Repo Scripts

These scripts are used to help maintain the repo.

- `fix-release-please-config.ts` keeps the `release-please-config.json` file up to date when packages are added.
- `fix-package-json.ts` lints and fixes any `packages/*/package.json` issues.
- `fix-tags-readme.ts` regenerates each package's `docs/tags-table.md` from its `src/tags.ts`'s
  `tagsAndMeaning` export (packages that don't export one are skipped), so a package's README Tags table is
  generated from the tag definitions in code rather than hand-copied from them. Run `pnpm run build:readme`
  afterward to actually inject the regenerated table into that package's `README.md`.

All three scripts accept a `--dry-run` flag that reports what would change (via stderr) and exits with a
non-zero status if a fix is needed, without writing anything. `pnpm run lint` runs all three in fixing mode
before `eslint`/`prettier`; `pnpm run lint-ci` runs all three with `--dry-run` so CI fails if a package.json,
`release-please-config.json`, or a `docs/tags-table.md` is out of date.
