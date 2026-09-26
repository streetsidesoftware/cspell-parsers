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
- [ ] `keywords` names the programming language, plus any common alternate names, such as `go` and `golang`.
- [ ] `dependencies` has only what the parser needs at run time. Keep production dependencies few.
- [ ] Every dependency, and anything bundled into `dist/` or copied into `src/`, passes the
      [license review](../dependency-licenses.md). Stop and raise any dependency that would force the package's
      MIT license to change.
- [ ] `exports` has a subpath for each published file (step 3).
- [ ] `files` stays `["dist", "!dist/**/*.map"]`, so npm ships only built output, without source maps.
- [ ] The copied `LICENSE` file stays.
- [ ] `@cspell/cspell-types` is a `devDependencies` entry, not `dependencies`. Its types are bundled into
      `dist/*.d.ts`, so users don't need it installed.
- [ ] `"@internal/utils": "workspace:*"` is a `devDependencies` entry. tsdown bundles it automatically.

Don't edit these by hand: `pnpm run lint` runs `fix-package-json` (`scripts/fix-package-json.ts`), which sets
them for every package:

- `repository`, with `directory` pointing at the package. npm's provenance check needs it.
- `publishConfig`: public access with provenance.
- The order of the fields.

`tsdown.config.ts` lists only `entry`; every other build option comes from the shared
`.config/tsdown.config.ts`. [Build and packaging](../build-and-packaging.md) explains the reasons behind these.

## 3. Implement the parser

Files under `src/`:

| File             | Published | What it holds                                                                                             |
| ---------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `parsers.ts`     | no        | `parse`, the `parsers` array, and `supportedFileTypes`. All the real logic.                               |
| `tags.ts`        | no        | `tagsAndMeaning` (generates the README's tags table) and `tags` (defaults). Required, except in a bundle. |
| `plugin.ts`      | yes       | `plugin`, `supportedFileTypes`, and `customizePlugin`.                                                    |
| `index.ts`       | yes       | Default export: settings with just `plugins: [plugin]`, typed as a local `SelectedCSpellSettings`.        |
| `recommended.ts` | yes       | Default export: `plugin.defineConfig()`, with `plugins` and `languageSettings`.                           |

Checklist:

- [ ] Each published file has both a `tsdown.config.ts` entry and a `package.json` `exports` subpath. One
      missing from `entry` builds without error and quietly leaves the subpath broken.
- [ ] Internal modules, such as `parsers.ts`, `scanner.ts`, and `tags.ts`, have neither. tsdown bundles them
      into the entry points that import them.
- [ ] Publish `tags.ts` as `./tags` only if users need the tag constants. Of the current packages, only the
      TypeScript tree-sitter ones do.
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
- [ ] Tags follow the [tag naming conventions](../tags.md#naming-conventions) and reuse existing tags where
      they fit. The tags emerge as you build the parser; you don't need them all up front.
- [ ] Every emitted tag is in `tags.ts` as soon as the parser emits it: `tagsAndMeaning` gives its one-line
      meaning (which generates the README's tags table and [`docs/tags.md`](../tags.md)), and `tags` says whether
      it's checked by default.
- [ ] Before the PR, the whole tag set is reviewed against the conventions. After release, a renamed tag breaks
      users' filters.
- [ ] `plugin.ts` builds `plugin` with `createPlugin({ name, parsers })` and exports
      `supportedFileTypes = plugin.supportedFileTypes`.
- [ ] `plugin.ts` exports `customizePlugin(options?)`, a thin wrapper around
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
- [ ] `plugin.test.ts` checks that `customizePlugin` actually filters `parsedTexts`.
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
- [ ] There are at least `plugin/`, `recommended/`, and `customize/`.
- [ ] Samples for common patterns use the standard folder names:

      | Folder                 | Shows                                                  |
      | ---------------------- | ------------------------------------------------------ |
      | `plugin/`              | Wiring `plugin` and `languageSettings` by hand         |
      | `recommended/`         | Importing `recommended`                                |
      | `customize/`           | A tag filter with `customizePlugin`                    |
      | `check-code/`          | Turning the `code` tag on                              |
      | `filter-by-file-type/` | Filtering one parser or file type with the builder     |

      Name any other sample after the feature or edge condition it exercises.

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
- [ ] A `Tag` / `Meaning` table lists every tag, including ancestors such as
      `comment`. It's injected from `docs/tags-table.csv`, generated from `tags.ts`.
- [ ] A short "Filtering by tag" section shows `customizePlugin`. See
      `packages/parser-typescript-strings-comments/README.md`'s "Filtering by tag and file type".

## 7. Link, lint, and check

- [ ] `pnpm install` from the repo root links the new package into the workspace.
- [ ] `pnpm run build && pnpm run build:readme` generates the README tables.
- [ ] `pnpm run lint` fixes what it can and adds the package to `release-please-config.json`. Commit what it
      changes. Never edit `release-please-config.json` or `.release-please-manifest.json` by hand; see
      [Releasing](../releasing.md).
- [ ] `pnpm run lint-ci`, `pnpm run typecheck`, and `pnpm test` pass.
- [ ] `pnpm exec cspell .` passes from the repo root. CI's spell check covers the whole repo, which `lint-ci`
      doesn't.
