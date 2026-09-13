# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm install
pnpm run build       # pnpm -r run build     — tsdown, per package
pnpm run typecheck   # pnpm -r run typecheck — tsc --noEmit, per package
pnpm test            # pnpm -r run test      — vitest run, per package
pnpm run lint
pnpm run lint-ci      # --max-warnings 0, what CI runs
pnpm run clean        # pnpm -r run clean
```

All of the above operate across every package in `packages/*` via `pnpm -r`. To scope to one package, `cd`
into it and run the underlying command directly (e.g. `cd packages/parser-example && pnpm run build`).

Run a single test file or test case with vitest directly from inside a package:

```sh
cd packages/parser-example
pnpm exec vitest run src/index.test.ts
pnpm exec vitest run -t 'excludes a leading YAML front-matter block'
```

CI runs `build` + `typecheck` + `test` in `.github/workflows/test.yml` and `lint-ci` in
`.github/workflows/lint.yml`, as two separate workflows.

## Architecture

This is a pnpm workspace monorepo (`packages/*`) for cspell parser packages — each package under `packages/`
is a standalone npm package implementing cspell's `Parser`/`Plugin` contract (types from
`@cspell/cspell-types`) so it can be loaded via a cspell configuration's `plugins` list.

**Toolchain split** — deliberately not the typical `tsc`-only setup:

- **tsdown** builds each package's `dist/` output (config in each package's `tsdown.config.ts`). TypeScript
  itself is used *only* for type-checking (`tsc --noEmit`), never for emitting.
- There is no TypeScript project-reference/`composite` build graph — `tsconfig.base.json` sets `noEmit: true`
  and each package has its own flat `tsconfig.json` extending it. There is intentionally no root
  `tsconfig.json`.
- **vitest** runs tests; there's no separate test-specific tsconfig.
- `tsdown`/`vitest`/`typescript` are declared once as root `devDependencies` (not duplicated per package) and
  resolve into packages via Node's normal ancestor `node_modules` lookup, which works even though
  `pnpm-workspace.yaml` sets `nodeLinker: isolated`.

**Shared dependency versions** live in the pnpm catalog in `pnpm-workspace.yaml`
(`typescript`, `tsdown`, `vitest`, `@cspell/cspell-types`). New packages should reference these via
`"catalog:"` rather than pinning their own versions, so every package stays in lockstep.

**Package shape** (see `packages/parser-example` as the canonical template):

- `src/index.ts` exports a `Parser` (`{ name, parse(content, filename) }`) and a `Plugin`
  (`{ parsers: [parser] }`), matching the types in `@cspell/cspell-types`. `parse` returns a `ParseResult`
  whose `parsedTexts` entries carry `range: [start, end]` offsets *relative to the original file content* —
  getting these offsets right is the core correctness concern of any parser here, since cspell uses them to
  map spelling issues back to the source.
- Build output is plain `dist/index.js` + `dist/index.d.ts` (ESM only). This requires
  `fixedExtension: false` in `tsdown.config.ts` — tsdown's default (`fixedExtension: true` on the default
  `platform: 'node'`) would otherwise emit `.mjs`/`.d.mts`, which doesn't match this package's
  `main`/`types`/`exports` fields.
- `@cspell/cspell-types` is a real `dependencies` entry (not `devDependencies`) on each parser package, since
  consumers' editors/tsc need to resolve the `Parser`/`Plugin` types from the published `.d.ts`.

To add a new parser package: copy `packages/parser-example`, rename it, replace the parsing logic, and run
`pnpm install` from the repo root to link it into the workspace (see `CONTRIBUTING.md` for the full steps).

Dependency updates are handled by Dependabot (`.github/dependabot.yml`), not Renovate — dev and production
dependencies are grouped into separate PRs, as are GitHub Actions version bumps.
