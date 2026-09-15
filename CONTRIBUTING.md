# Contributing

Thanks for considering a contribution to cspell-parsers.

## Workspace layout

This is a pnpm workspace monorepo (`packages/*`) for cspell parser packages — each package under `packages/`
is a standalone npm package implementing cspell's `Parser`/`Plugin` contract (types from
`@cspell/cspell-types`) so it can be loaded via a cspell configuration's `plugins` list.

- `packages/parser-typescript` is the canonical, fully-fledged package — use it as the template for a new
  parser.
- `packages/parser-example` is a minimal single-file starter that predates that convention; fine to start
  from for a trivial parser, but bring it in line with the full shape (see "Adding a new parser package"
  below) before publishing it as a real plugin.

Each package:

- builds its `dist/` output with [tsdown](https://tsdown.dev)
- is type-checked with `tsc --noEmit` (TypeScript is used for type-checking only, not for emitting output)
- is tested with [vitest](https://vitest.dev)

Shared dependency versions (TypeScript, tsdown, vitest, `@cspell/cspell-types`) are pinned once via the pnpm
[catalog](https://pnpm.io/catalogs) in `pnpm-workspace.yaml`.

## Getting started

```sh
pnpm install
pnpm run build       # pnpm -r run build     — tsdown, per package
pnpm run typecheck   # pnpm -r run typecheck — tsc --noEmit, per package
pnpm test            # pnpm -r run test      — vitest run, per package
pnpm run lint         # eslint + prettier --write — auto-fixes what it can
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
`.github/workflows/lint.yml`, as two separate workflows. Run `pnpm lint` before a final `pnpm run
lint-ci`/`pnpm test` pass, since it auto-fixes what it can rather than just reporting.

## Adding a new parser package

1. Copy `packages/parser-typescript` to `packages/<your-parser-name>` for the full shape below, or
   `packages/parser-example` if you just want a minimal single-file starting point (bring it in line with
   the full shape before publishing it as a real plugin).
2. Update `package.json`: `name`, `description`, `dependencies`, and the `exports` map for each file you're
   publishing. Leave `files` (`["dist", "!dist/**/*.map"]`), `repository`, and `sourcemap: true` in
   `tsdown.config.ts` as-is, and keep the copied `LICENSE` file — these are all required for `npm publish` to
   ship a correct, provenance-verifiable package without leaking source maps (see `CLAUDE.md`'s "Package
   shape" note). Keep `@cspell/cspell-types` a `devDependencies` entry, not `dependencies` — tsdown bundles
   its types into `dist/*.d.ts`, so consumers don't need it installed (see `CLAUDE.md`'s "Package shape"
   note on `deps.onlyBundle`).
3. Implement the parser as four files under `src/`, each with a matching `package.json` `exports` subpath
   and `tsdown.config.ts` entry (see `CLAUDE.md`'s "Package shape" for why both matter):
   - `parser.ts` — `parse(content, filename): ParseResult` and `export const parser: Parser`. This is where
     all the real logic lives. If segments carry `tags`, use dot-separated hierarchical tag names as the
     `ParsedTags` keys (e.g. `comment.block.doc`), each with a `true` value, and include every ancestor
     alongside the most specific tag (`comment.block.doc` implies also emitting `comment` and
     `comment.block`) so cspell's `validate` setting can filter at any level of specificity — see
     `packages/parser-typescript/CONTRIBUTING.md`'s "Tags" section for the full convention.
   - `plugin.ts` — `export const plugin: Plugin = { parsers: [parser] }`.
   - `index.ts` — default export: an `AdvancedCSpellSettings` with just `plugins: [plugin]`.
   - `recommended.ts` — default export: an `AdvancedCSpellSettings` with `plugins: [plugin]` **and**
     `languageSettings` mapping the relevant language IDs to the parser by name, so it works standalone.
4. Write tests: `parser.test.ts` for real parsing behavior — put realistic input in `fixtures/` (excluded
   from `tsc`/ESLint/Prettier, since a fixture's exact bytes are often what's being asserted on) rather than
   inline strings — plus thin `plugin.test.ts` / `index.test.ts` / `recommended.test.ts` that just check each
   file wires the layer below it together.
5. Add a `samples/` package (copy `packages/parser-typescript/samples`) with one subfolder per usage pattern,
   each holding a real cspell config and real source files it checks — this is what `test:cspell` (`cspell .`)
   exercises end-to-end, alongside `test:vitest`'s unit tests, combined as the package's `test` script. Give
   the package its own root `cspell.config.yaml` (ignoring `node_modules`/`fixtures`/`dist`) so that passes
   cleanly.
6. Write `README.md` for someone **using** the plugin, not reading its source — lead with how to add it to a
   cspell config; keep internals secondary. If `parser.ts` emits `tags`, include a table listing every tag
   it can emit (including implied ancestor tags, e.g. `comment` alongside `comment.block.doc`) and what each
   one means — see `CLAUDE.md`'s "`README.md`" note for why this belongs in the README rather than being
   omitted with the rest of the internals.
7. Run `pnpm install` from the repo root to link the new package(s) into the workspace.
8. If the new package is publishable to npm (not `private: true`), add it to `release-please-config.json`'s
   `packages` map (`"packages/<your-parser-name>": {}`) and to `.release-please-manifest.json`
   (`"packages/<your-parser-name>": "1.0.0"`) so release-please tracks its version/changelog and includes it
   in release PRs. Private/internal packages don't need either entry — the root `"."` entry is the one that
   must stay, since its version bump is what tags the release and triggers the publish workflow (see
   `CLAUDE.md`'s "Release and publish flow" note).

## Before submitting a pull request

```sh
pnpm run build
pnpm run typecheck
pnpm run lint-ci
pnpm test
```

All of the above run in CI and must pass.

## Commit style

Keep commits focused and describe the _why_ in the commit message, not just the _what_.
