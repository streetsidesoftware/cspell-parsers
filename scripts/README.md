# Repo Scripts

These scripts are used to help maintain the repo.

- `fix-release-please-config.ts` keeps the `release-please-config.json` file up to date when packages are added.
- `fix-package-json.ts` lints and fixes any `packages/*/package.json` issues.

Both scripts accept a `--dry-run` flag that reports what would change (via stderr) and exits with a
non-zero status if a fix is needed, without writing anything. `pnpm run lint` runs both in fixing mode
before `eslint`/`prettier`; `pnpm run lint-ci` runs both with `--dry-run` so CI fails if a package.json or
`release-please-config.json` is out of date.
