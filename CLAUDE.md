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

**Build and packaging** — the toolchain (tsdown builds, `tsc` only type-checks, vitest tests), the pnpm
catalog, bundled types, `@internal/utils`, what gets published, and `fixtures/`/`samples/` are described in
`docs/build-and-packaging.md`. Read it before changing build config, dependencies, or how types are shared.

**Package shape** — `packages/parser-typescript-strings-comments` is the canonical, fully-fledged template. It has
two parsers; most packages have one, as `packages/parser-csharp-strings-comments` does. Either way, the parsers
live in `src/parsers.ts`. `packages/parser-example` is kept as a minimal reference (fine to start from for a
trivial parser, but bring it in line with the shape below if it needs `scope` or more tags).

The plugin is the only way to reach a parser (`plugin.getParser(name)`); no package publishes a `./parser`
subpath. See `docs/ADRs/typescript-parser-split/0005-plugin-only-entry-point.md`. Every package publishes three
entry points, each its own file under `src/` and its own subpath in `package.json`'s `exports`: `.`
(`src/index.ts`), `./plugin`, and `./recommended`. The TypeScript tree-sitter packages (`parser-typescript`,
`parser-typescript-tree-sitter`, `parser-typescript-tree-sitter-wasm`) also publish `./tags`.

- `src/parsers.ts` — internal (no `exports` subpath, no tsdown entry), and the real parsing logic. Exports
  `parsers: readonly IParser[]`, even when the package has only one parser, each built with `@internal/utils`'s
  `createPluginParserWithFilterTags`. A hand-written scanner package also exports the raw
  `parse(content, filename): ParseResult` for its tests. `parse`'s `ParseResult`
  carries `parsedTexts` entries with `range: [start, end]` offsets _relative to the original file content_ —
  getting these right is the core correctness concern of any parser here, since cspell uses them to map
  spelling issues back to the source. A parser must also survive any input: cspell can send it a fragment rather than a whole
  file (a markdown code block, for example), so malformed or partial code must never make `parse` throw.
  Unterminated constructs run to the end of the content, and every `range` stays within it. `parsedTexts` is typed `Iterable<ParsedText>`, not an array — for a
  hand-written scanner with no memory-retention concern (nothing held onto across the scan needs to be freed
  by a consumer draining the result, unlike a tree-sitter backend's parse tree), emit it lazily via a
  generator (`function*`/`yield`) rather than collecting into an array first; see
  `packages/parser-typescript-strings-comments/src/scanner.ts`'s `Scanner` for the pattern (`run()` and its
  per-construct helpers are generators that `yield`/`yield*` directly, rather than pushing onto an array
  field). A package with one parser also exports `supportedFileTypes: string[]` — the cspell/vscode language
  IDs (e.g. `'typescript'`, `'javascriptreact'`) the parser is meant to handle, kept alphabetically sorted —
  as the single source of truth for its `languageSettings`, so the list only needs updating in one place.
- `src/plugin.ts` — thin wiring: `export const plugin: IPlugin = createPlugin({ name, parsers })`, plus
  `export const supportedFileTypes: readonly string[] = plugin.supportedFileTypes`.
  Published as `./plugin` → `dist/plugin.js`. Every parser emits `tags`, so it also re-exports
  `@internal/utils`'s shared options (`export type { CustomizePluginOptions } from '@internal/utils'`) and exports
  `function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder`, a thin wrapper around
  `customizePluginWith(plugin, options)`, so a consumer can filter which tagged segments get spell checked
  without needing cspell itself to support that filtering. The result can be adjusted further and turned into
  a complete config with `defineConfig()`. See `packages/parser-typescript-strings-comments/src/plugin.ts` for
  the pattern.
- `src/index.ts` — the package's main entry (`.` / `main`). Exports a default settings object with just
  `plugins: [plugin]` — the parser is registered but not yet selected for any file type, so a consumer still
  has to add their own `languageSettings`. Typed as a small local `SelectedCSpellSettings` interface
  (`{ plugins: CSpellPlugin[] }`) rather than the full `AdvancedCSpellSettings`, to keep `dist/index.d.ts`
  small — see `docs/build-and-packaging.md`'s "Settings types are local". `index.test.ts` separately checks
  the object is still assignable to `AdvancedCSpellSettings`.
- `src/recommended.ts` — a batteries-included alternative, published as `./recommended` →
  `dist/recommended.js`. Exports `plugin.defineConfig()`: `plugins: [plugin]` **and** the plugin's
  `languageSettings`, so a consumer only has to `"import": ["@cspell/parser-x/recommended"]` and nothing
  else.

Packages built from other packages' plugins have no `src/parsers.ts`: `parser-typescript` and
`parser-javascript` (from `parser-typescript-tree-sitter-wasm`'s plugin), and `parser-strings-comments`
(which bundles the language packages' plugins).

Every entry-point file needs a matching entry in **both** `tsdown.config.ts`'s `entry` array and
`package.json`'s `exports` map — these two lists are independent and tsdown does not infer one from the
other. A file missing from `entry` builds no error, just a `dist/` quietly missing that file, which only
surfaces when something imports the corresponding `exports` subpath. Double-check both whenever a new
entry point is added. Internal modules (`parsers.ts`, `scanner.ts`, `tags.ts` when not published) are in
neither list; tsdown bundles them into the entry points that import them.

Tests mirror the same split: `parsers.test.ts` carries the real parsing coverage (using fixtures — see
`docs/build-and-packaging.md`); `plugin.test.ts` / `index.test.ts` / `recommended.test.ts` are thin, checking only that each file
wires the layer below it together correctly (e.g. `plugin.parsers` equals `parsers`, `recommended`'s
settings include the right `languageSettings`).

See `docs/build-and-packaging.md` for `fixtures/`, `samples/`, `@internal/utils`, bundled types, dist size,
and the `package.json` fields `fix-package-json` sets.

**Release and publish flow** — see `docs/releasing.md`. Never hand-edit `release-please-config.json`'s
`packages` map or add a package to `.release-please-manifest.json`: `pnpm run lint` maintains the first, and
release-please the second.

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

Guides (`docs/guides/`, `CONTRIBUTING.md` files) and other docs for people never point to `CLAUDE.md`. If a guide
needs something that's only here, move it into its own doc under `docs/` and link to that from both, as
`docs/build-and-packaging.md` and `docs/releasing.md` do. In guides, give each step a heading and list its checks
one per item rather than burying them in a paragraph.

Label every example that is a whole config file with its filename in bold, directly above the code block, e.g.
**`cspell.config.jsonc`** or **`cspell.config.ts`** or **`cspell.config.mjs`**. Don't name the file in a comment
inside the code. Snippets that aren't a whole file (a single call, an options object) don't need a label.

Every example that is a whole config file comes from a real sample under `samples/`, injected with
`<!--- @@inject: samples/<name>/cspell.config.jsonc#lang=jsonc --->` / `<!--- @@inject-end: … --->` markers, so
`test:cspell` checks it. Don't hand-write one. In a JSON or YAML config, cspell ignores a plugin named as a string
in `plugins`: load it with `"import": ["@cspell/<package>"]` instead, since the package's main entry registers
the plugin.

Every parser emits `tags`, declared in a required `src/tags.ts`: its `tagsAndMeaning` generates the README's tags
table, and its `tags` sets which are checked by default. `README.md` must include that table, listing every tag
(including ancestor tags implied by `hierarchicalTags`, e.g. `comment` alongside `comment.block.doc`) with a
one-line description of what each one means. This is reference material for using the plugin, not an
implementation detail to omit: it's what a consumer needs to write a `customizePlugin({ tags: ... })` filter
by tag. Keep it to a plain two-column `Tag` / `Meaning` table — no discussion of how the parser computes or
assigns the tags.

Name tags by `docs/tags.md`'s conventions, and reuse the tags listed there where they fit. That page's table is
generated from every package's `tags.ts` by `fix-parser-readme`.

`README.md` must also include a "Supported file types" section — this is what a consumer checks before
deciding whether `recommended` already covers their file types or they need to wire `languageSettings`
themselves. Don't hand-write its table: add
`<!--- @@inject: docs/language-id-n-parser-name.csv --->` / `<!--- @@inject-end: docs/language-id-n-parser-name.csv --->`
markers and run `pnpm run build && pnpm run build:readme`. `fix-parser-readme` generates that CSV from the
built plugin's `parsers` (see `scripts/README.md`).

Because every parser emits `tags`, `plugin.ts` also exports `customizePlugin` (see
"Package shape" above), and `README.md` must show it: a short "Filtering by tag" (or similarly named)
section, after the plain `plugin`/`languageSettings` wiring example, with a runnable snippet calling
`customizePlugin({ tags: { ... } })` and pointing at the tags table for what keys are available. See
`packages/parser-typescript-strings-comments/README.md`'s "Filtering by tag and file type" section for the
pattern to copy.

When adding or editing a `.md` file that contains deliberate spelling errors (e.g. demonstrating what a
parser flags or ignores), add a `<!-- cspell:ignore ... -->` comment at the end of the file listing those
words, so the repo's own spellcheck doesn't flag them.

To add a new parser package: use the `new-parser-plugin` skill, which designs it and then builds it by
`docs/guides/new-parser-package.md`. A new package is named `@cspell/parser-<language>[-<specialization>]`, where the
optional suffix is a specialization or the AST parser used (`@cspell/parser-php-strings-comments`,
`@cspell/parser-typescript-tree-sitter`).

Dependency updates are handled by Dependabot (`.github/dependabot.yml`), not Renovate — dev and production
dependencies are grouped into separate PRs, as are GitHub Actions version bumps.
