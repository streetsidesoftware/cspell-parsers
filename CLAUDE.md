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
  itself is used _only_ for type-checking (`tsc --noEmit`), never for emitting.
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

**Package shape** — `packages/parser-typescript` is the canonical, fully-fledged template; `packages/parser-example`
predates this convention and is kept as a minimal single-file reference (fine to start from for a trivial
parser, but bring it in line with the shape below if it needs `tags`/`scope`/a `recommended` entry point).

Every package publishes **four** things, each its own file under `src/` and its own subpath in `package.json`'s
`exports`:

- `src/parser.ts` — the real parsing logic. Exports `parse(content, filename): ParseResult` and
  `parser: Parser` (`{ name, parse }`), matching the types in `@cspell/cspell-types`. `parse`'s `ParseResult`
  carries `parsedTexts` entries with `range: [start, end]` offsets _relative to the original file content_ —
  getting these right is the core correctness concern of any parser here, since cspell uses them to map
  spelling issues back to the source. Published as `./parser` → `dist/parser.js`.
- `src/plugin.ts` — thin wiring: `export const plugin: Plugin = { parsers: [parser] }`. Published as
  `./plugin` → `dist/plugin.js`.
- `src/index.ts` — the package's main entry (`.` / `main`). Exports a default `AdvancedCSpellSettings` with
  just `plugins: [plugin]` — the parser is registered but not yet selected for any file type, so a consumer
  still has to add their own `languageSettings`.
- `src/recommended.ts` — a batteries-included alternative, published as `./recommended` →
  `dist/recommended.js`. Exports a default `AdvancedCSpellSettings` with `plugins: [plugin]` **and**
  `languageSettings` mapping the relevant language IDs to the parser by name, so a consumer only has to
  `"import": ["@cspell/parser-x/recommended"]` and nothing else.

Every top-level `src/*.ts` file needs a matching entry in **both** `tsdown.config.ts`'s `entry` array and
`package.json`'s `exports` map — these two lists are independent and tsdown does not infer one from the
other. A file missing from `entry` builds no error, just a `dist/` quietly missing that file, which only
surfaces when something imports the corresponding `exports` subpath. Double-check both whenever a new
top-level file is added.

Tests mirror the same split: `parser.test.ts` carries the real parsing coverage (using fixtures — see
below); `plugin.test.ts` / `index.test.ts` / `recommended.test.ts` are thin, checking only that each file
wires the layer below it together correctly (e.g. `plugin.parsers` includes `parser`, `recommended`'s
settings include the right `languageSettings`).

Two more directories, both at the package root (not under `src/`):

- `fixtures/` — raw, arbitrary source snippets fed straight through `parser.parse()` in tests. Their exact
  bytes (quote style, spacing) are often what a test is asserting on, so this directory is excluded from
  `tsc` (tsconfig `exclude`), ESLint (`ignores`), and Prettier (`.prettierignore`) — never let a formatter or
  linter "fix" a fixture.
- `samples/` — a separate nested pnpm workspace package (registered via `packages/*/samples` in the root
  `pnpm-workspace.yaml`; its own `package.json` with a `workspace:*` devDependency on the parser package),
  with one subfolder per usage pattern (e.g. `samples/plugin/`, `samples/recommended/`), each holding a real
  cspell config plus real, correctly-spelled source files. This is an end-to-end demo, checked for real by
  `test:cspell` (`cspell .` from the package root, which picks up each sample's own config), run alongside
  `test:vitest` as the package's combined `test` script. Each package also carries its own root
  `cspell.config.yaml` (ignoring `node_modules`/`fixtures`, plus any package-local word list) so `cspell .`
  passes cleanly over the whole package.
- `@cspell/cspell-types` is a real `dependencies` entry (not `devDependencies`) on each parser package, since
  consumers' editors/tsc need to resolve the `Parser`/`Plugin`/`AdvancedCSpellSettings` types from the
  published `.d.ts`.
- Build output is plain `dist/*.js` + `dist/*.d.ts` (ESM only, one pair per entry). This requires
  `fixedExtension: false` in `tsdown.config.ts` — tsdown's default (`fixedExtension: true` on the default
  `platform: 'node'`) would otherwise emit `.mjs`/`.d.mts`, which doesn't match a package's
  `main`/`types`/`exports` fields.

`README.md` is written for someone **installing and using** the parser as a cspell plugin, not for a
contributor reading the source. Lead with the couple of lines needed to add it to a cspell config (the
`recommended` import, and/or manually wiring `plugin` + `languageSettings`); keep implementation details
(how the AST walk works, the scope/tag taxonomy, etc.) secondary or omitted entirely — someone installing
this off npm needs "how do I turn this on," not "how does it work."

To add a new parser package: see `CONTRIBUTING.md` for the full steps.

Dependency updates are handled by Dependabot (`.github/dependabot.yml`), not Renovate — dev and production
dependencies are grouped into separate PRs, as are GitHub Actions version bumps.
