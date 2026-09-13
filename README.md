# cspell-parsers

This repository is a pnpm monorepo for cspell parser packages.

## Workspace layout

- `packages/*` contains parser packages.
- `packages/parser-example` is the starter package. It implements cspell's `Parser`/`Plugin` contract from
  `@cspell/cspell-types` — copy it as a template for new parsers.

Each package:

- builds its `dist/` output with [tsdown](https://tsdown.dev)
- is type-checked with `tsc --noEmit` (TypeScript is used for type-checking only, not for emitting output)
- is tested with [vitest](https://vitest.dev)

Shared dependency versions (TypeScript, tsdown, vitest, `@cspell/cspell-types`) are pinned once via the pnpm
[catalog](https://pnpm.io/catalogs) in `pnpm-workspace.yaml`.

## Commands

```sh
pnpm install
pnpm run build
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run lint-ci
```
