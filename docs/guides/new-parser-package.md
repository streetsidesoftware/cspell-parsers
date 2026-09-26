# Adding a new parser package

For plugin authors adding a parser for a new language or file type to this repo. Read the
[plugin author guide](./plugin-author-guide.md) first. It covers cspell's rules for plugins and parsers, what
users do with a plugin, and what that means for how you write one.

With Claude Code, the `new-parser-plugin` skill runs these steps for you, after designing the package with you
first.

## 1. Copy a template

Copy one of these to `packages/parser-<name>`:

- **Hand-written scanner:** `packages/parser-typescript-strings-comments`, the full shape. It has two
  parsers sharing one scanner. `packages/parser-csharp-strings-comments` is the same shape with one parser.
- **AST-based parser:** `packages/parser-typescript-tree-sitter-wasm` (tree-sitter, with no native
  dependency).
- **Minimal starter:** `packages/parser-example`. Bring it in line with the full shape before publishing it.

## 2. Update `package.json`

- [ ] `name` has the form `@cspell/parser-<language>[-<specialization>]`. The optional suffix is a
      specialization or the AST parser used, as in `@cspell/parser-php-strings-comments` or
      `@cspell/parser-typescript-tree-sitter`.
- [ ] `description` says what the plugin checks.
- [ ] `keywords` names the programming language, plus any common alternate name, as in `go` and `golang`.
      Only you can add these; `fix-package-json` adds the generic ones.
- [ ] `dependencies` has only what the parser needs at run time. Keep production dependencies few.
- [ ] `exports` has a subpath for each published file (step 3).
- [ ] `files` stays `["dist", "!dist/**/*.map"]`, so npm ships only built output, without source maps.
- [ ] The copied `LICENSE` file stays.
- [ ] `@cspell/cspell-types` is a `devDependencies` entry, not `dependencies`. Its types are bundled into
      `dist/*.d.ts`, so users don't need it installed.
- [ ] If the parser emits `tags`, `"@internal/utils": "workspace:*"` is a `devDependencies` entry. tsdown
      bundles it automatically.

Don't edit these by hand: `pnpm run lint` runs `fix-package-json` (`scripts/fix-package-json.ts`), which sets
them for every package:

- `repository`, with `directory` pointing at the package. npm's provenance check needs it.
- `keywords`: adds the required ones (`cspell`, `parser`, `plugin`, `spell`, `spellchecker`) and sorts them.
- `publishConfig`: public access with provenance.
- The order of the fields.

`tsdown.config.ts` lists only `entry`; every other build option comes from the shared
`.config/tsdown.config.ts`. See [`CLAUDE.md`](../../CLAUDE.md)'s "Package shape" for the reasons behind these.

## 3. Implement the parser

Files under `src/`:

| File             | Published | What it holds                                                                   |
| ---------------- | --------- | ------------------------------------------------------------------------------- |
| `parsers.ts`     | no        | `parse`, the `parsers` array, and `supportedFileTypes`. All the real logic.     |
| `tags.ts`        | optional  | `tagsAndMeaning` and `tags`, if the parser emits tags.                          |
| `plugin.ts`      | yes       | `plugin`, `supportedFileTypes`, and `customizePlugin` if the parser emits tags. |
| `index.ts`       | yes       | Default export: settings with just `plugins: [plugin]`.                         |
| `recommended.ts` | yes       | Default export: `plugin.defineConfig()`, with `plugins` and `languageSettings`. |

Checklist:

- [ ] Each published file has both a `tsdown.config.ts` entry and a `package.json` `exports` subpath. One
      missing from `entry` builds without error and quietly leaves the subpath broken.
- [ ] `parsers.ts` exports `parsers: readonly IParser[]`, even for a single parser. Each is created with
      `@internal/utils`'s `createPluginParserWithFilterTags`, which applies the default filter from `tags`.
- [ ] `parsers.ts` is internal. The plugin is the only way to reach a parser: `plugin.getParser(name)`.
- [ ] `supportedFileTypes` lists the cspell/VS Code language IDs the parser handles (such as `'typescript'`),
      sorted alphabetically. They generate its `languageSettings`.
- [ ] `parse(content, filename)` returns `parsedTexts` whose `range` offsets are relative to the original
      content. Getting these right is the core correctness concern.
- [ ] `parse` survives any input and never throws. cspell can send it a fragment, such as a markdown code
      block. Unterminated constructs run to the end of the content, and every `range` stays within it.
- [ ] A hand-written scanner emits `parsedTexts` lazily, with generators.
- [ ] Tags are dot-separated and hierarchical (`comment.block.doc`), and each segment carries every ancestor
      (`comment`, `comment.block`), so a filter can match at any level. See
      `packages/parser-typescript/CONTRIBUTING.md`'s "Tags" section.
- [ ] Every emitted tag is in `tags.ts`: `tagsAndMeaning` gives its one-line meaning (which generates the
      README's tags table), and `tags` says whether it's checked by default.
- [ ] `plugin.ts` builds `plugin` with `createPlugin({ name, parsers })` and exports
      `supportedFileTypes = plugin.supportedFileTypes`.
- [ ] If the parser emits tags, `plugin.ts` exports `customizePlugin(options?)`, a thin wrapper around
      `@internal/utils`'s `customizePluginWith(plugin, options)`. Copy
      `packages/parser-typescript-strings-comments/src/plugin.ts`.

## 4. Write tests

- [ ] `parsers.test.ts` covers the real parsing behavior, with input in `fixtures/` rather than inline
      strings. `fixtures/` is excluded from tsc, ESLint, and Prettier, since a fixture's exact bytes are often
      what's being tested.
- [ ] Fixtures cover malformed and partial input: an unterminated string or comment, a fragment that starts or
      ends mid-construct, and text in another language.
- [ ] A test checks that `parse` doesn't throw on those fixtures and keeps every `range` within the content.
- [ ] `plugin.test.ts`, `index.test.ts`, and `recommended.test.ts` are thin: each checks that its file wires
      the layer below it together.
- [ ] If the parser emits tags, `plugin.test.ts` checks that `customizePlugin` actually filters `parsedTexts`.
      See `packages/parser-typescript-strings-comments/src/plugin.test.ts`.
- [ ] Every special case the README mentions has a test.

## 5. Add samples

`samples/` is its own workspace package (copy `packages/parser-typescript-strings-comments/samples`), with one
subfolder per sample. Each holds a real cspell config and real, correctly spelled source files. Samples have
two purposes:

- They're the examples in the README. Every config example there is injected from a sample.
- They prove the plugin works with cspell: that `recommended` does what it should, and that each feature, tag,
  or edge condition behaves as described. There can be many more samples than the README uses.

Checklist:

- [ ] Each sample demonstrates or exercises one feature, tag, or edge condition.
- [ ] There are at least `plugin/` and `recommended/`, and `customize/` if the parser emits tags.
- [ ] The package has its own root `cspell.config.yaml`, ignoring `node_modules`, `fixtures`, and `dist`, so
      `cspell .` passes over the whole package. `test:cspell` runs it as part of the package's `test` script.
- [ ] Each filter sample, such as `customize/`, has a genuine misspelling in a segment its filter excludes.
      Don't explain the typo by name in a comment: that comment is itself checked unless its tag is excluded
      too.
- [ ] Each filter sample is checked both ways: with the sample's config, and with `plugin.defineConfig()`,
      each using `--no-config-search`. The misspelling is flagged only without the filter. See
      `packages/parser-typescript-strings-comments/samples/customize`.

## 6. Write the README

The README is for someone using the plugin, not reading its source. npmjs.com renders it on its own page.

- [ ] It leads with how to add the plugin to a cspell config. Internals are secondary.
- [ ] Its intro says what the plugin checks and why someone would pick it.
- [ ] Every config example is injected from a sample:
      `<!--- @@inject: samples/<name>/cspell.config.jsonc#lang=jsonc --->`. Label each with its file name in
      bold.
- [ ] Every special case links to its test with a hidden comment:
      `<!--- Tested by src/parsers.test.ts: "<test name>" --->`.
- [ ] Every link and image is an absolute `https://` URL. Same-page anchors (`#tags`) are fine.
- [ ] A "Supported file types" section injects the generated `docs/language-id-n-parser-name.csv`. Copy the
      inject markers from another package's README.
- [ ] If the parser emits tags, a `Tag` / `Meaning` table lists every tag, including ancestors such as
      `comment`. It's injected from `docs/tags-table.csv`, generated from `tags.ts`.
- [ ] If the parser emits tags, a short "Filtering by tag" section shows `customizePlugin`. See
      `packages/parser-typescript-strings-comments/README.md`'s "Filtering by tag and file type".

## 7. Link, lint, and check

- [ ] `pnpm install` from the repo root links the new package into the workspace.
- [ ] `pnpm run build && pnpm run build:readme` generates the README tables.
- [ ] `pnpm run lint` fixes what it can and adds the package to `release-please-config.json`. Commit what it
      changes. Never edit `release-please-config.json` or `.release-please-manifest.json` by hand; see
      `CLAUDE.md`'s "Release and publish flow".
- [ ] `pnpm run lint-ci`, `pnpm run typecheck`, and `pnpm test` pass.
- [ ] `pnpm exec cspell .` passes from the repo root. CI's spell check covers the whole repo, which `lint-ci`
      doesn't.
