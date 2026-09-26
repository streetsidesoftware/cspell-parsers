# Adding a new parser package

For plugin authors adding a parser for a new language or file type to this repo. Read the
[plugin author guide](./plugin-author-guide.md) first. It covers cspell's rules for plugins and parsers, what
users do with a plugin, and what that means for how you write one.

With Claude Code, the `new-parser-plugin` skill runs these steps for you, after designing the package with you
first.

1. Copy a template to `packages/<your-parser-name>`:
   - For a hand-written scanner, `packages/parser-typescript-strings-comments`, the full shape below. It has
     two parsers sharing one scanner, so it keeps them in `src/parsers.ts` and has no `./parser` subpath. For
     one parser, use `src/parser.ts` instead, as `packages/parser-csharp-strings-comments` does.
   - For an AST-based parser, `packages/parser-typescript-tree-sitter-wasm` (tree-sitter, with no native
     dependency).
   - For a minimal single-file starting point, `packages/parser-example`. Bring it in line with the full shape
     before publishing it as a real plugin.
2. Update `package.json`: `name`, `description`, `dependencies`, and the `exports` map for each file you're
   publishing. Leave `files` (`["dist", "!dist/**/*.map"]`) and `repository` as-is, and keep the copied
   `LICENSE` file — these are all required for `npm publish` to ship a correct, provenance-verifiable package
   without leaking source maps (see [`CLAUDE.md`](../../CLAUDE.md)'s "Package shape" note). Keep
   `@cspell/cspell-types` a `devDependencies` entry, not `dependencies` — tsdown bundles its types into
   `dist/*.d.ts`, so consumers don't need it installed (see `CLAUDE.md`'s "Package shape" note on
   `deps.onlyBundle`). If `parser.ts` will emit `tags` (see step 3), also add
   `"@internal/utils": "workspace:*"` as a `devDependencies` entry — it's a private, unpublished workspace
   package, and tsdown bundles workspace dependencies into `dist/*.js`/`dist/*.d.ts` automatically, without
   needing a `deps.onlyBundle` entry of its own (see `CLAUDE.md`'s "Package shape" note on `@internal/utils`).
   `tsdown.config.ts` only lists `entry`; every other build option comes from the shared
   `.config/tsdown.config.ts`.
3. Implement the parser as these files under `src/`, each with a matching `package.json` `exports` subpath and
   `tsdown.config.ts` entry (see `CLAUDE.md`'s "Package shape" for why both matter):
   - `parser.ts` — `parse(content, filename): ParseResult`, `export const parser: IParser` (created with
     `@internal/utils`'s `createPluginParserWithFilterTags`, which applies the default filter from `tags`),
     and `export const supportedFileTypes: string[]` (the cspell/vscode language IDs the parser handles, e.g.
     `'typescript'`, `'javascriptreact'`, kept alphabetically sorted), which generate its `languageSettings`.
     This is where all the real logic lives. If segments carry `tags`, use dot-separated hierarchical tag
     names as the `ParsedTags` keys (e.g. `comment.block.doc`), each with a `true` value, and include every
     ancestor alongside the most specific tag (`comment.block.doc` implies also emitting `comment` and
     `comment.block`) so a `customizePlugin` filter can match at any level of specificity — see
     `packages/parser-typescript/CONTRIBUTING.md`'s "Tags" section for the full convention.
   - `plugin.ts` — `export const plugin: IPlugin = createPlugin({ name, parsers: [parser] })` plus
     `export { supportedFileTypes } from './parser.ts'`. If `parser.ts` emits `tags`, also export
     `function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder`, a thin wrapper around
     `@internal/utils`'s `customizePluginWith(plugin, options)` — see
     `packages/parser-typescript-strings-comments/src/plugin.ts` for the pattern to copy. This is what lets a
     consumer filter which tagged segments get spell checked, then call `defineConfig()` for a complete
     config.
   - `tags.ts` — if segments carry `tags`: `tagsAndMeaning` (every tag the parser can emit, with a one-line
     meaning, which generates the README's tags table) and `tags` (which of them are checked by default).
   - `index.ts` — default export: an `AdvancedCSpellSettings` with just `plugins: [plugin]`.
   - `recommended.ts` — default export: `plugin.defineConfig()`, which has `plugins: [plugin]` **and** the
     plugin's `languageSettings`, so it works standalone.
4. Write tests: `parser.test.ts` for real parsing behavior — put realistic input in `fixtures/` (excluded from
   `tsc`/ESLint/Prettier, since a fixture's exact bytes are often what's being asserted on) rather than inline
   strings — plus thin `plugin.test.ts` / `index.test.ts` / `recommended.test.ts` that just check each file
   wires the layer below it together (including, if present, that `customizePlugin` actually filters
   `parsedTexts` when wired to the real parser — see
   `packages/parser-typescript-strings-comments/src/plugin.test.ts`).
5. Add a `samples/` package (copy `packages/parser-typescript-strings-comments/samples`) with one subfolder
   per usage pattern — `plugin/`, `recommended/`, and, if `parser.ts` emits `tags`, `customize/` for
   `customizePlugin` — each holding a real cspell config and real source files it checks. This is what
   `test:cspell` (`cspell .`) exercises end-to-end, alongside `test:vitest`'s unit tests, combined as the
   package's `test` script. Give the package its own root `cspell.config.yaml` (ignoring
   `node_modules`/`fixtures`/`dist`) so that passes cleanly. For `customize/` specifically, prove the filter
   is doing something real: put a genuine misspelling cspell would otherwise flag in a segment `validate`
   excludes (not in a comment that explains the typo by name — that comment is itself checked unless its own
   tag is excluded too, which is exactly the mistake to avoid), and check it both ways: run cspell with the
   sample's config and with `plugin.defineConfig()`, each with `--no-config-search`, so the sample's own
   config doesn't apply to both runs. See `packages/parser-typescript-strings-comments/samples/customize` for
   the pattern to copy.
6. Write `README.md` for someone **using** the plugin, not reading its source — lead with how to add it to a
   cspell config; keep internals secondary. Its intro says what the plugin checks and why someone would pick
   it. Every config example is injected from a sample
   (`<!--- @@inject: samples/<name>/cspell.config.jsonc#lang=jsonc --->`), so `test:cspell` checks it. Every
   special case it mentions has a test, linked with a hidden
   `<!--- Tested by src/parser.test.ts: "<test name>" --->` comment. Links are absolute `https://` URLs, since
   npmjs.com renders the README on its own. Include a "Supported file types" section whose table is injected
   from the generated `docs/language-id-n-parser-name.csv` (copy the inject markers from an existing package's
   README, then run `pnpm run build && pnpm run build:readme`). If `parser.ts` emits `tags`, also include a
   table listing every tag it can emit (including implied ancestor tags, e.g. `comment` alongside
   `comment.block.doc`) and what each one means — see `CLAUDE.md`'s "`README.md`" note for why these belong in
   the README rather than being omitted with the rest of the internals. Also add a short "Filtering by tag"
   section showing `customizePlugin` in use, since it's how a consumer actually applies that tags table — see
   `packages/parser-typescript-strings-comments/README.md`'s "Filtering by tag and file type" section for the
   pattern to copy.
7. Run `pnpm install` from the repo root to link the new package(s) into the workspace.
8. Run `pnpm run lint` before committing, and include whatever it changes (e.g. `release-please-config.json`)
   in your commit. Never hand-edit `release-please-config.json` or `.release-please-manifest.json` yourself —
   see `CLAUDE.md`'s "Release and publish flow" note for why.
9. Run the full checks from the repo root: `pnpm run build && pnpm run build:readme`, then `pnpm run lint-ci`,
   `pnpm run typecheck`, `pnpm test`, and `pnpm exec cspell .`. CI's spell check covers the whole repo, which
   `lint-ci` doesn't.
