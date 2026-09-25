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

Once you're done making changes, run `pnpm lint` from the repo root — it auto-fixes what it can (ESLint +
`prettier --write`) rather than just reporting, so run it before a final `pnpm run lint-ci`/`pnpm test` pass.

## Pull requests

After pushing more commits to an already-open PR, re-check that its body still matches — see CONTRIBUTING.md's
"Commits & pull requests" section for what the body should contain.

## Design principles

An operation changes only what its caller targets or names. Don't add hidden side effects to avoid repetition
or to keep data normalized. A convenience method is built from the explicit steps a user would write, minus any
step that touches something the user didn't name. Where that leaves overlap, rely on order (for example, the
last parser wins) rather than changing other entries. See
`docs/ADRs/plugin-customization/0001-design-principles.md`.

## Code style

Use explicit escape sequences (e.g. `\u2028`, `\u2029`) rather than literal invisible/non-printing
characters in source code — including inside string/regex literals and `switch` `case` labels. A literal
invisible character is nearly indistinguishable from its neighbors in a diff or review, and editors/formatters
can silently mangle or normalize it; an explicit escape keeps the intent visible.

Keep comments short. Maintainers are experienced programmers — a comment should cover the "what" and, only
when it's non-obvious, a bit of the "why"; it should never take longer to read than the code it's attached
to. Favor one line over a `/** ... */` block, and a block only when a single line can't fit the essential
point. Don't restate what well-named identifiers already say, don't walk through alternatives that were
rejected, and don't repeat the same rationale in multiple comments across a file — say it once, where it's
most load-bearing, and link to it (by function name) from anywhere else it'd otherwise be repeated.

Keep a single comment line to 140 characters or fewer. Wrap into a multi-line `/** ... */`/`// ...` block
instead of letting one line run long — this applies even to a one-line `/** ... */` doc comment.

## Architecture

This is a pnpm workspace monorepo (`packages/*`) for cspell parser packages — each package under `packages/`
is a standalone npm package implementing cspell's `Parser`/`Plugin` contract (types from
`@cspell/cspell-types`) so it can be loaded via a cspell configuration's `plugins` list.

**Toolchain split** — deliberately not the typical `tsc`-only setup:

- **tsdown** builds each package's `dist/` output. Every option except `entry` lives once in
  `.config/tsdown.config.ts`; each package's `tsdown.config.ts` is just
  `mergeConfig(base, { entry: [...] })` — put new shared build options in the base, not per package.
  TypeScript itself is used _only_ for type-checking (`tsc --noEmit`), never for emitting.
- There is no TypeScript project-reference/`composite` build graph — `tsconfig.base.json` sets `noEmit: true`
  and each package has its own flat `tsconfig.json` extending it. There is intentionally no root
  `tsconfig.json`.
- **vitest** runs tests; there's no separate test-specific tsconfig.
- `tsdown`/`vitest`/`typescript` are declared once as root `devDependencies` (not duplicated per package) and
  resolve into packages via Node's normal ancestor `node_modules` lookup, which works even though
  `pnpm-workspace.yaml` sets `nodeLinker: isolated`.
- Relative imports use `.ts` extensions (e.g. `from './parser.ts'`), not `.js` — `tsconfig.base.json` sets
  `allowImportingTsExtensions: true` (permitted because `noEmit` is also `true`), and tsdown resolves and
  rewrites these to `.js` in `dist/` output.

**Shared dependency versions** live in the pnpm catalog in `pnpm-workspace.yaml`
(`typescript`, `tsdown`, `vitest`, `@cspell/cspell-types`). New packages should reference these via
`"catalog:"` rather than pinning their own versions, so every package stays in lockstep.

**Package shape** — `packages/parser-typescript-strings-comments` is the canonical, fully-fledged template; `packages/parser-example`
predates this convention and is kept as a minimal single-file reference (fine to start from for a trivial
parser, but bring it in line with the shape below if it needs `tags`/`scope`/a `recommended` entry point).

Every package publishes **four** things, each its own file under `src/` and its own subpath in `package.json`'s
`exports`:

- `src/parser.ts` — the real parsing logic. Exports `parse(content, filename): ParseResult` and
  `parser: Parser` (`{ name, parse }`), matching the types in `@cspell/cspell-types`. `parse`'s `ParseResult`
  carries `parsedTexts` entries with `range: [start, end]` offsets _relative to the original file content_ —
  getting these right is the core correctness concern of any parser here, since cspell uses them to map
  spelling issues back to the source. `parsedTexts` is typed `Iterable<ParsedText>`, not an array — for a
  hand-written scanner with no memory-retention concern (nothing held onto across the scan needs to be freed
  by a consumer draining the result, unlike a tree-sitter backend's parse tree), emit it lazily via a
  generator (`function*`/`yield`) rather than collecting into an array first; see
  `packages/parser-typescript-strings-comments/src/parser.ts`'s `Scanner` for the pattern (`run()` and its
  per-construct helpers are generators that `yield`/`yield*` directly, rather than pushing onto an array
  field). Published as `./parser` → `dist/parser.js`. Also exports
  `supportedFileTypes: string[]` — the cspell/vscode language IDs (e.g. `'typescript'`, `'javascriptreact'`)
  the parser is meant to handle, kept alphabetically sorted — as the single source of truth `recommended.ts`
  builds its `languageSettings` from, so the list only needs updating in one place.
- `src/plugin.ts` — thin wiring: `export const plugin: IPluginEx = createPluginEx({ name, parsers: [parser] })`
  (with `parser` created by `@internal/utils`'s `createPluginParserWithFilterTags`), plus
  `export { supportedFileTypes } from './parser.ts'` so it's reachable from the `./plugin` subpath too.
  Published as `./plugin` → `dist/plugin.js`. If `parser.ts` emits `tags`, also re-export `@internal/utils`'s
  shared options (`export type { CustomizePluginExOptions as CustomizePluginOptions } from '@internal/utils'`)
  and `function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder`, a thin wrapper around
  `customizePluginEx(plugin, options)`, so a consumer can filter which tagged segments get spell checked
  without needing cspell itself to support that filtering. The result can be adjusted further and turned into
  a complete config with `defineConfig()`. See `packages/parser-typescript-strings-comments/src/plugin.ts` for
  the pattern. Packages not yet migrated still use `IPlugin` and `customizeParserPlugin`; see
  `docs/guides/plugin-author-guide.md`.
- `src/index.ts` — the package's main entry (`.` / `main`). Exports a default settings object with just
  `plugins: [plugin]` — the parser is registered but not yet selected for any file type, so a consumer still
  has to add their own `languageSettings`. Typed as a small local `SelectedCSpellSettings` interface
  (`{ plugins: CSpellPlugin[] }`) rather than the full `AdvancedCSpellSettings`, to keep `dist/index.d.ts`
  small — see the dist-size bullet below. `index.test.ts` separately checks the object is still assignable
  to `AdvancedCSpellSettings`.
- `src/recommended.ts` — a batteries-included alternative, published as `./recommended` →
  `dist/recommended.js`. Exports `plugin.defineConfig()`: `plugins: [plugin]` **and** the plugin's
  `languageSettings`, so a consumer only has to `"import": ["@cspell/parser-x/recommended"]` and nothing
  else.

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
  `cspell.config.yaml` (ignoring `node_modules`/`fixtures`/`dist`, plus any package-local word list) so
  `cspell .` passes cleanly over the whole package — `dist` is ignored because it's generated build output,
  and (see below) now contains the bundled third-party `@cspell/cspell-types` declarations verbatim, typos
  and all.
- `@internal/utils` (`packages/internal-utils`) is a private, unpublished workspace package holding logic
  shared across parser packages — currently the tag-matching engine behind `customizePlugin`
  (`compileTagFilter` turns a `TagFilterOptions` object into a fast `TagsFilter` closure once, up front,
  rather than re-matching patterns per parsed segment). A package that uses it lists
  `"@internal/utils": "workspace:*"` as a `devDependencies` entry, same as `@cspell/cspell-types` —
  but unlike `@cspell/cspell-types`, it's a workspace package, so tsdown bundles its code and types into
  `dist/*.js`/`dist/*.d.ts` automatically and does **not** need (and warns as unused if given) its own
  `deps.onlyBundle` entry. Its build emits only `dist/index.d.ts`: `exports` maps `types` to that file and
  `default` to `src/index.ts`, so vitest and tsdown bundle the JS straight from source while `tsc` and tsdown's
  (lazy, fast) dts read the prebuilt declarations. Lazy dts fails with `MISSING_EXPORT` on `.ts` source outside
  the consumer's own `tsc` program, and `dts: { eager: true }` avoids that but made the build ~3x slower. That
  `dist/index.d.ts` keeps `@cspell/cspell-types` external (`deps.neverBundle`) so each consumer inlines a single
  deduped copy. Rebuild it after changing `@internal/utils`'s exported types, or consumers typecheck against
  stale declarations.
- `@cspell/cspell-types` is a `devDependencies` entry (not `dependencies`) on each parser package. tsdown
  bundles the types of anything that isn't a production/peer/optional dependency straight into the emitted
  `dist/*.d.ts` (this is the same mechanism that decides what gets bundled into `dist/*.js` — see
  `deps.onlyBundle` in the shared tsdown config below), so a devDependency's declarations end up inlined rather
  than referenced via an `import` a consumer would need to resolve. This means consumers get the
  `Parser`/`Plugin`/`AdvancedCSpellSettings` types without installing `@cspell/cspell-types` themselves.
  The shared tsdown config sets `deps: { onlyBundle: ['@cspell/cspell-types'] }` to make this
  intentional (tsdown otherwise only logs a hint about unexpected bundled dependencies) and to fail the
  build if some other, unintended dependency ends up inlined. A package that needs another type-only
  dependency bundled the same way overrides `deps.onlyBundle` in its own `mergeConfig` call.
- **Keep `dist` size and the number of production dependencies low** — both are deliberately optimized for
  in this repo. Verify `dist` size (especially `dist/*.d.ts`) before/after any change to how types or
  dependencies are shared across packages, and be conservative about adding any new production
  `dependencies` entry. tsdown's `.d.ts` bundler only inlines the `@internal/utils` declarations a package
  actually references, so sharing a type through `@internal/utils` doesn't bloat packages that don't use it.
  Adding a type to `@internal/utils` grows only its own `dist/index.d.ts` until a package imports it. It
  doesn't dedupe `@cspell/cspell-types` declarations reached through two different import paths, though:
  that's why each package's `index.ts` defines `SelectedCSpellSettings` locally against `@cspell/cspell-types`
  instead of importing a shared one.
- Build output is plain `dist/*.js` + `dist/*.d.ts` (ESM only, one pair per entry). This requires
  `fixedExtension: false` in the shared tsdown config — tsdown's default (`fixedExtension: true` on the default
  `platform: 'node'`) would otherwise emit `.mjs`/`.d.mts`, which doesn't match a package's
  `main`/`types`/`exports` fields.
- Every package's `package.json` sets `"files": ["dist", "!dist/**/*.map"]`, so `npm publish` ships only built
  output — without it, npm falls back to including everything not gitignored (`src/`, `fixtures/`, `samples/`,
  `docs/`, `tsconfig.json`, `tsdown.config.ts`, ...). `package.json`, `README.md`, and `LICENSE` are always
  included by npm regardless of `files`, so they don't need to be listed. Every package also carries its own
  copy of the root `LICENSE` (same MIT text) at its package root, since npm only bundles a `LICENSE` that lives
  inside the package being published, not one from the repo root.
- The shared tsdown config sets `sourcemap: true`, so `dist/*.js.map` is generated for local debugging from a
  checkout, but the `!dist/**/*.map` entry in `files` (above) keeps those `.map` files out of the published
  tarball.
- Publishable packages (`publishConfig.provenance: true`) need a `repository` field —
  `{ "type": "git", "url": "git+https://github.com/streetsidesoftware/cspell-parsers.git", "directory": "packages/<name>" }` —
  matching the actual GitHub remote, with `directory` pointing at that package's
  subfolder. Without it, `npm publish`'s sigstore provenance check fails (`repository.url` is "" but the CI
  attestation expects it to match the repo the build ran in).

**Release and publish flow** — `release-please` (`.github/workflows/release-please.yml`, config in
`release-please-config.json`, versions tracked in `.release-please-manifest.json`) opens a release PR per
package listed in `release-please-config.json`'s `packages` map, bumping versions/changelogs from conventional
commits. Merging that PR tags the root package (`cspell-parsers@x.y.z`, from the `"."` entry — the
`tag-separator: "@"` / `include-v-in-tag: false` settings control that format), which is the tag
`.github/workflows/publish.yml` listens for to run `lerna publish from-package --no-private`; lerna publishes
every workspace package whose version changed and skips `private: true` ones regardless of whether they're in
`release-please-config.json`. So only **publishable** packages need an entry in `release-please-config.json`'s
`packages` map (so their version/changelog is tracked and they end up in the release PR) — private/internal
packages don't need one, since lerna would skip them anyway. The `"."` entry must always stay: it's what
produces the tag that triggers the publish workflow, independent of whether the root package itself is
published (it's `private: true` and never is).

**Never hand-edit `release-please-config.json`'s `packages` map.** `pnpm exec fix-release-please-config`
(part of `pnpm run lint`, and checked read-only by `pnpm run lint-ci`'s `--dry-run` pass) regenerates it from
every `packages/parser*/package.json`, adding an entry for any package whose name doesn't start with
`@internal`. A new publishable package gets picked up automatically the next time `pnpm run lint` runs —
just run it before committing, same as for `package.json` itself (see `fix-package-json`, above).

**Never add a brand-new package to `.release-please-manifest.json`, by hand or otherwise** — nothing in this
repo should. The manifest records each package's _last released_ version, and release-please computes the
next release as a bump from whatever's there; seeding it (e.g. at `"1.0.0"`) for a package that's never
actually shipped makes release-please treat that version as already-released, so the package's real first
publish lands above `1.0.0` instead of at it. release-please adds its own manifest entry automatically the
first time it actually releases the package - the `release-please-config.json` entry alone is enough for it
to pick the package up and bootstrap it at `1.0.0` itself.

`README.md` is written for someone **installing and using** the parser as a cspell plugin, not for a
contributor reading the source. Lead with the couple of lines needed to add it to a cspell config (the
`recommended` import, and/or manually wiring `plugin` + `languageSettings`); keep implementation details
(how the AST walk works, why a given segment gets the tag it does, etc.) secondary or omitted entirely —
someone installing this off npm needs "how do I turn this on," not "how does it work."

A package's `README.md` is rendered on npmjs.com on its own, so every link and image in it must be an absolute
`https://` URL. Relative links (`./docs/…`, `../../CONTRIBUTING.md`, `samples/…`) resolve on GitHub but break on
npm. Links to anchors on the same page (`#tags`) are fine. Don't point users at repo files such as
`CONTRIBUTING.md` from a package README at all.

In `README.md` and any other user-facing text (guides, doc comments users see in their editor, the release-note
part of a `feat:`/`fix:` PR body), don't start a sentence in a paragraph or note with a code span: it reads as if
the start of the sentence is missing. Lead with a word instead, e.g. "Use `customizePlugin` to…", "Both `a` and
`b`…", "Keys in `tags`…". List items can start with code.

Label every example that is a whole config file with its filename in bold, directly above the code block, e.g.
**`cspell.config.jsonc`** or **`cspell.config.ts`** or **`cspell.config.mjs`**. Don't name the file in a comment
inside the code. Snippets that aren't a whole file (a single call, an options object) don't need a label.

Every example that is a whole config file comes from a real sample under `samples/`, injected with
`<!--- @@inject: samples/<name>/cspell.config.jsonc#lang=jsonc --->` / `<!--- @@inject-end: … --->` markers, so
`test:cspell` checks it. Don't hand-write one. In a JSON or YAML config, cspell ignores a plugin named as a string
in `plugins`: load it with `"import": ["@cspell/<package>"]` instead, since the package's main entry registers
the plugin.

If the parser emits `tags` on any segment, `README.md` must include a table listing every tag it can emit
(including ancestor tags implied by `hierarchicalTags`, e.g. `comment` alongside `comment.block.doc`) with a
one-line description of what each one means. This is reference material for using the plugin, not an
implementation detail to omit: it's what a consumer needs to write a `customizePlugin({ tags: ... })` filter
by tag. Keep it to a plain two-column `Tag` / `Meaning` table — no discussion of how the parser computes or
assigns the tags.

`README.md` must also include a "Supported file types" section — this is what a consumer checks before
deciding whether `recommended` already covers their file types or they need to wire `languageSettings`
themselves. Don't hand-write its table: add
`<!--- @@inject: docs/language-id-n-parser-name.csv --->` / `<!--- @@inject-end: docs/language-id-n-parser-name.csv --->`
markers and run `pnpm run build && pnpm run build:readme`. `fix-parser-readme` generates that CSV from the
built plugin's `parsers` (see `scripts/README.md`).

The same "if the parser emits `tags`" condition also means `plugin.ts` exports `customizePlugin` (see
"Package shape" above), and `README.md` must show it: a short "Filtering by tag" (or similarly named)
section, after the plain `plugin`/`languageSettings` wiring example, with a runnable snippet calling
`customizePlugin({ tags: { ... } })` and pointing at the tags table for what keys are available. See
`packages/parser-typescript-strings-comments/README.md`'s "Filtering by tag and file type" section for the
pattern to copy.

When adding or editing a `.md` file that contains deliberate spelling errors (e.g. demonstrating what a
parser flags or ignores), add a `<!-- cspell:ignore ... -->` comment at the end of the file listing those
words, so the repo's own spellcheck doesn't flag them.

To add a new parser package: see `CONTRIBUTING.md` for the full steps.

Dependency updates are handled by Dependabot (`.github/dependabot.yml`), not Renovate — dev and production
dependencies are grouped into separate PRs, as are GitHub Actions version bumps.
