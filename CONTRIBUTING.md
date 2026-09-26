# Contributing

Thanks for considering a contribution to cspell-parsers.

## TL;DR

This repo publishes cspell plugins: each package under `packages/` provides parsers that let cspell users
control what gets spell checked. Start with the
[plugin author guide](docs/guides/plugin-author-guide.md). It explains how cspell uses plugins and
parsers, and how to write one here.

- **No hidden side effects:** an operation changes only what its caller targets or names, even if that means
  some repetition.
- **Set up:** `pnpm install`, then `pnpm run build` and `pnpm test`.
- **Add a parser:** with Claude Code, use the `new-parser-plugin` skill. By hand, copy
  `packages/parser-typescript-strings-comments` (the full template; it has two parsers, see below) and follow
  the guide.
- **Before a PR:** `pnpm run build`, `pnpm run typecheck`, `pnpm run lint` (auto-fixes), `pnpm test`. CI runs
  `build`, `typecheck`, and `test`, plus `pnpm run lint-ci` (a read-only lint) in a separate workflow.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/). Use `feat:`/`fix:` only for
  changes a user of a published package would notice. Everything else is `chore:`, `refactor:`, `docs:`,
  etc.
- **PR descriptions:** short, with a `## Summary` that stands on its own.

The rest of this file is the full reference, written mainly for coding agents.

<details>
<summary>Details for Agents</summary>

## Workspace layout

This is a pnpm workspace monorepo (`packages/*`) for cspell parser packages — each package under `packages/`
is a standalone npm package implementing cspell's `Parser`/`Plugin` contract (types from
`@cspell/cspell-types`) so it can be loaded via a cspell configuration's `plugins` list.

- `packages/parser-typescript-strings-comments` is the canonical, fully-fledged package — use it as the template for a new
  parser. Like every package, it keeps its parsers in `src/parsers.ts` and publishes no `./parser` subpath. It
  has two parsers, which share a scanner; most packages have one, as `packages/parser-csharp-strings-comments`
  does.
- `packages/parser-example` is a minimal starter with one parser; fine to start from for a trivial parser,
  but bring it in line with the full shape (see "Adding a new parser package" below) before publishing it as
  a real plugin.

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

Read the [plugin author guide](docs/guides/plugin-author-guide.md) first. It covers cspell's rules for
plugins and parsers, what users do with a plugin, and what that means for how you write one.

1. Copy `packages/parser-typescript-strings-comments` to `packages/<your-parser-name>` for the full shape below, or
   `packages/parser-example` if you just want a minimal starting point with one parser (bring it in line with
   the full shape before publishing it as a real plugin).
2. Update `package.json`: `name`, `description`, `dependencies`, and the `exports` map for each entry point
   you're publishing. Leave `files` (`["dist", "!dist/**/*.map"]`) and `repository` as-is, and keep the copied `LICENSE` file — these are all required for `npm publish` to
   ship a correct, provenance-verifiable package without leaking source maps (see `CLAUDE.md`'s "Package
   shape" note). Keep `@cspell/cspell-types` a `devDependencies` entry, not `dependencies` — tsdown bundles
   its types into `dist/*.d.ts`, so consumers don't need it installed (see `CLAUDE.md`'s "Package shape"
   note on `deps.onlyBundle`). If `parsers.ts` will emit `tags` (see step 3), also add
   `"@internal/utils": "workspace:*"` as a `devDependencies` entry — it's a private, unpublished
   workspace package, and tsdown bundles workspace dependencies into `dist/*.js`/`dist/*.d.ts`
   automatically, without needing a `deps.onlyBundle` entry of its own (see `CLAUDE.md`'s "Package shape"
   note on `@internal/utils`). `tsdown.config.ts` only lists `entry`; every other build option comes from
   the shared `.config/tsdown.config.ts`.
3. Implement the parser in `src/parsers.ts`, which is internal, plus three entry points under `src/`, each
   with a matching `package.json` `exports` subpath and `tsdown.config.ts` entry (see `CLAUDE.md`'s "Package
   shape" for why both matter):
   - `parsers.ts` — `parse(content, filename): ParseResult`, `export const supportedFileTypes: string[]` (the
     cspell/vscode language IDs the parser handles, e.g. `'typescript'`, `'javascriptreact'`, kept
     alphabetically sorted), which generate its `languageSettings`, and
     `export const parsers: readonly IParser[]`, even for one parser (each created with `@internal/utils`'s
     `createPluginParserWithFilterTags`, which applies the default filter from `tags`). It has no `exports`
     subpath or `tsdown.config.ts` entry: the plugin is the only way to reach a parser, through
     `plugin.getParser(name)`. This is where all the real logic lives. If segments carry `tags`, use
     dot-separated hierarchical tag names as the `ParsedTags` keys (e.g. `comment.block.doc`), each with a
     `true` value, and include every ancestor alongside the most specific tag (`comment.block.doc` implies
     also emitting `comment` and `comment.block`) so a `customizePlugin` filter can match at any level of
     specificity — see
     `packages/parser-typescript/CONTRIBUTING.md`'s "Tags" section for the full convention.
   - `plugin.ts` — `export const plugin: IPlugin = createPlugin({ name, parsers })` plus
     `export const supportedFileTypes: readonly string[] = plugin.supportedFileTypes`. If `parsers.ts` emits
     `tags`, also export
     `function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder`, a thin wrapper around
     `@internal/utils`'s `customizePluginWith(plugin, options)` — see
     `packages/parser-typescript-strings-comments/src/plugin.ts` for the pattern to copy. This is what lets a
     consumer filter which tagged segments get spell checked, then call `defineConfig()` for a complete config.
   - `index.ts` — default export: an `AdvancedCSpellSettings` with just `plugins: [plugin]`.
   - `recommended.ts` — default export: `plugin.defineConfig()`, which has `plugins: [plugin]` **and** the
     plugin's `languageSettings`, so it works standalone.
4. Write tests: `parsers.test.ts` for real parsing behavior — put realistic input in `fixtures/` (excluded
   from `tsc`/ESLint/Prettier, since a fixture's exact bytes are often what's being asserted on) rather than
   inline strings — plus thin `plugin.test.ts` / `index.test.ts` / `recommended.test.ts` that just check each
   file wires the layer below it together (including, if present, that `customizePlugin` actually filters
   `parsedTexts` when wired to the real parser — see `packages/parser-typescript-strings-comments/src/plugin.test.ts`).
5. Add a `samples/` package (copy `packages/parser-typescript-strings-comments/samples`) with one subfolder per usage pattern
   — `plugin/`, `recommended/`, and, if `parsers.ts` emits `tags`, `customize/` for `customizePlugin` — each
   holding a real cspell config and real source files it checks. This is what `test:cspell` (`cspell .`)
   exercises end-to-end, alongside `test:vitest`'s unit tests, combined as the package's `test` script. Give
   the package its own root `cspell.config.yaml` (ignoring `node_modules`/`fixtures`/`dist`) so that passes
   cleanly. For `customize/` specifically, prove the filter is doing something real: put a genuine misspelling
   cspell would otherwise flag in a segment `validate` excludes (not in a comment that explains the typo by name —
   that comment is itself checked unless its own tag is excluded too, which is exactly the mistake to avoid),
   and sanity-check by temporarily swapping in the plain `plugin` to confirm `cspell .` actually fails without
   the filter, the way `packages/parser-typescript-strings-comments/samples/customize` does — see its `cspell.config.mts` and
   `example.ts` for the pattern to copy.
6. Write `README.md` for someone **using** the plugin, not reading its source — lead with how to add it to a
   cspell config; keep internals secondary. Include a "Supported file types" section whose table is injected from
   the generated `docs/language-id-n-parser-name.csv` (copy the inject markers from an existing package's
   README, then run `pnpm run build && pnpm run build:readme`). If `parsers.ts` emits `tags`, also include a table listing every tag it can
   emit (including implied ancestor tags, e.g. `comment` alongside `comment.block.doc`) and what each one
   means — see `CLAUDE.md`'s "`README.md`" note for why these belong in the README rather than being omitted
   with the rest of the internals. Also add a short "Filtering by tag" section showing `customizePlugin` in
   use, since it's how a consumer actually applies that tags table — see
   `packages/parser-typescript-strings-comments/README.md`'s "Filtering by tag and file type" section for the
   pattern to copy.
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

## Commits & pull requests

Keep commits focused and describe the _why_ in the commit message, not just the _what_.

Follow [Conventional Commits](https://www.conventionalcommits.org/). Release Please derives the version bump
and changelog from the type, so pick it by user-facing impact, not by how much code changed:

- `feat:` — a feature or other change a user of a published package would notice.
- `fix:` — a bug fix that changes published behavior.
- `feat!:` / `fix!:` — either of the above, but breaking.
- `perf:` — a performance improvement a consumer would notice, with no behavior change.
- `revert:` — undoes a previously merged commit. Visible in the changelog under its own "Reverts" section, so
  consumers can see a shipped `feat:`/`fix:` got undone.
- `refactor:` — internal restructuring with no behavior change.
- `docs:` — documentation only (README, ADRs, CONTRIBUTING.md, etc.).
- `style:` — formatting-only changes with no logic difference (e.g. rewrapping a comment, fixing whitespace).
- `test:` — test-only changes.
- `ci:` — GitHub Actions/workflow changes, including automated dependency bumps.
- `chore:` — everything else that doesn't touch published behavior: repo tooling, Claude Code skills/config,
  dev dependencies, lint/format config, build tooling (tsdown, pnpm catalog), etc.

Repo maintenance and internal restructuring are never `fix:`/`feat:`, even for a large diff — those two are
reserved for changes to a published package's behavior, because `fix:`/`feat:` are what show up in the
changelog and bump the version.

This repo's release notes span every `packages/*` package in one PR (see `release-please-config.json`'s
`packages` map), so scope commits to the affected package's directory name when a change is package-specific
— e.g. `feat(parser-ruby-strings-comments): add catch-all code tag` — so a reader can tell which package a
changelog line is about.

If a PR merges under the wrong type, see the `release-notes` Claude Code skill for correcting the entry after
the fact via a `BEGIN_COMMIT_OVERRIDE` block, rather than rewriting history.

### PR descriptions

Keep PR descriptions short — no one reads a long one. Prefer bullet points over prose paragraphs; a sentence
packed with more than one or two `inline code` spans is hard to parse — break it into a list instead.

Use `##` headings to break up sections rather than running everything together as prose — one for each part
below that applies.

- `## Summary` — a one- or two-sentence TL;DR that stands on its own: what changed and why, in plain prose.
  It should be readable without anything that follows, not a fragment a later section completes. If the why
  needs more room than that, give it its own sentence or two right after.
- `fix:` and `feat:` PRs are user-facing and feed release notes — write for a reader deciding whether a
  change affects them, not for a reviewer reviewing the diff.
  - For `feat:` PRs, add a `## Feature` heading with a short paragraph on the feature itself: what it lets
    the user do that they couldn't before, and — where it shapes how they should think about using it — why
    it was designed that way (e.g. why a tag is opt-in, why `customizePlugin` takes a struct instead of a
    bare options object).
- `refactor:`/`chore:` PRs are for reviewers, not consumers, so implementation detail belongs here rather
  than being trimmed out — but keep it to the _what_ and _why it matters to a reviewer_, not a mechanical
  _how_ or a narration of the steps taken to get there (e.g. don't mention that something was adapted from
  another repo, or walk through exploration/dead ends). Group by theme (what changed, not which file it
  lives in) — label each group with a short effect/topic phrase, e.g. `**Hidden refactors**`, not a file
  path like `**release-please-config.json**`. A single-item group reads fine as a short paragraph after its
  label; reach for bullets when the group covers several distinct changes, or when one change's rationale
  stacks up more than about two independent facts — that reads as a dense wall however few changes it
  describes. Not `<details>`-gated, since a reviewer needs to see it to review the PR. A `##`/`###` heading
  or a bold label (`**Topic**` on its own line before the paragraph/bullets) both work; use a bold label
  when a full heading would be heavier than the group needs.
- If needed, further detail in `<details>` blocks (e.g. `<summary>Usage</summary>`, `<summary>Details</summary>`),
  as bullet points, not prose paragraphs — these stay collapsed, unlike the `##` headings above, so lead with
  what actually needs a click.
  - For a `feat:`/`fix:` PR touching a parser's output, `Usage` should cover any change to
    `supportedFileTypes`, the `tags` a segment can carry, or `customizePlugin`'s filtering options — with a
    cspell config snippet where it helps.
- No test plan section — CI covers that.

Do not:

- Restate the diff or narrate file-by-file changes.
- Narrate the process of arriving at the change (where content was copied from, exploration or dead ends,
  which attempt fixed what) — describe the resulting change and why it matters, not the journey there.
- On `fix:`/`feat:` PRs, explain internal implementation, refactors, or code structure the user doesn't
  interact with — that's what `refactor:`/`chore:` PRs are for.
- Add tables, code walkthroughs, or before/after examples for internal behavior.
- Compress the TL;DR into a bare fragment or list of renamed symbols that only makes sense once you've read
  the bullets below it.
- Add auto-generated links back to individual diff hunks or lines (e.g. `[[1]]`/`[[2]]` permalinks) — the
  diff is already there for anyone reviewing.
- Write a separate section per commit or sub-change — one TL;DR covers the whole PR.

</details>
