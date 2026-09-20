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
   note on `deps.onlyBundle`). If `parser.ts` will emit `tags` (see step 3), also add
   `"@internal/utils": "workspace:*"` as a `devDependencies` entry — it's a private, unpublished
   workspace package, and tsdown bundles workspace dependencies into `dist/*.js`/`dist/*.d.ts`
   automatically, without needing a `deps.onlyBundle` entry of its own (see `CLAUDE.md`'s "Package shape"
   note on `@internal/utils`).
3. Implement the parser as four files under `src/`, each with a matching `package.json` `exports` subpath
   and `tsdown.config.ts` entry (see `CLAUDE.md`'s "Package shape" for why both matter):
   - `parser.ts` — `parse(content, filename): ParseResult`, `export const parser: Parser`, and
     `export const supportedFileTypes: string[]` (the cspell/vscode language IDs the parser handles, e.g.
     `'typescript'`, `'javascriptreact'`, kept alphabetically sorted) — the single source of truth
     `recommended.ts` builds its `languageSettings` from. This is where all the real logic lives. If segments
     carry `tags`, use dot-separated hierarchical tag names as the `ParsedTags` keys (e.g.
     `comment.block.doc`), each with a `true` value, and include every ancestor alongside the most specific
     tag (`comment.block.doc` implies also emitting `comment` and `comment.block`) so cspell's `validate`
     setting can filter at any level of specificity — see `packages/parser-typescript/CONTRIBUTING.md`'s
     "Tags" section for the full convention.
   - `plugin.ts` — `export const plugin: ParserPlugin = { parsers: [parser] }` plus
     `export { supportedFileTypes } from './parser.js'`. If `parser.ts` emits `tags`, also export
     `function customizePlugin(validate: ValidationTags): Plugin`, a thin wrapper around
     `@internal/utils`'s `customizePlugin(plugin, validate)` bound to this package's own `plugin` — see
     `packages/parser-typescript/src/plugin.ts` for the pattern to copy. This is what lets a consumer filter
     which tagged segments get spell checked without needing a cspell version that already applies
     `validate` itself.
   - `index.ts` — default export: an `AdvancedCSpellSettings` with just `plugins: [plugin]`.
   - `recommended.ts` — default export: an `AdvancedCSpellSettings` with `plugins: [plugin]` **and**
     `languageSettings` mapping `supportedFileTypes.join(',')` to the parser by name, so it works standalone.
4. Write tests: `parser.test.ts` for real parsing behavior — put realistic input in `fixtures/` (excluded
   from `tsc`/ESLint/Prettier, since a fixture's exact bytes are often what's being asserted on) rather than
   inline strings — plus thin `plugin.test.ts` / `index.test.ts` / `recommended.test.ts` that just check each
   file wires the layer below it together (including, if present, that `customizePlugin` actually filters
   `parsedTexts` when wired to the real parser — see `packages/parser-typescript/src/plugin.test.ts`).
5. Add a `samples/` package (copy `packages/parser-typescript/samples`) with one subfolder per usage pattern
   — `plugin/`, `recommended/`, and, if `parser.ts` emits `tags`, `customize/` for `customizePlugin` — each
   holding a real cspell config and real source files it checks. This is what `test:cspell` (`cspell .`)
   exercises end-to-end, alongside `test:vitest`'s unit tests, combined as the package's `test` script. Give
   the package its own root `cspell.config.yaml` (ignoring `node_modules`/`fixtures`/`dist`) so that passes
   cleanly. For `customize/` specifically, prove the filter is doing something real: put a genuine misspelling
   cspell would otherwise flag in a segment `validate` excludes (not in a comment that explains the typo by name —
   that comment is itself checked unless its own tag is excluded too, which is exactly the mistake to avoid),
   and sanity-check by temporarily swapping in the plain `plugin` to confirm `cspell .` actually fails without
   the filter, the way `packages/parser-typescript/samples/customize` does — see its `cspell.config.mts` and
   `example.ts` for the pattern to copy.
6. Write `README.md` for someone **using** the plugin, not reading its source — lead with how to add it to a
   cspell config; keep internals secondary. Include a "Supported file types" section listing every language
   ID in `supportedFileTypes`. If `parser.ts` emits `tags`, also include a table listing every tag it can
   emit (including implied ancestor tags, e.g. `comment` alongside `comment.block.doc`) and what each one
   means — see `CLAUDE.md`'s "`README.md`" note for why these belong in the README rather than being omitted
   with the rest of the internals. Also add a short "Filtering by tag" section showing `customizePlugin` in
   use, since it's how a consumer actually applies that tags table — see
   `packages/parser-typescript/README.md`'s "Filtering by tag" section for the pattern to copy, and note
   there that it needs a JS/TS cspell config (`.mjs`/`.ts`/`.cjs`), not `.json`/`.jsonc`/`.yaml`.
7. Run `pnpm install` from the repo root to link the new package(s) into the workspace.
8. Run `pnpm run lint` before committing, and include whatever it changes (e.g. `release-please-config.json`)
   in your commit. Never hand-edit `release-please-config.json` or `.release-please-manifest.json` yourself —
   see `CLAUDE.md`'s "Release and publish flow" note for why.

## Before submitting a pull request

```sh
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm test
```

All of the above run in CI and must pass.

## Commit style

Keep commits focused and describe the _why_ in the commit message, not just the _what_.
