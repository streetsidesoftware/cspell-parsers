# Build and packaging

How the packages in this repo are built, tested, and packaged for npm, and why. For the steps to add a package,
see the [guide to adding a new parser package](./guides/new-parser-package.md).

## Toolchain

This isn't the typical `tsc`-only setup.

- **tsdown builds each package's `dist/`.** Every option except `entry` lives once in
  `.config/tsdown.config.ts`. Each package's `tsdown.config.ts` is just `mergeConfig(base, { entry: [...] })`.
  Put new shared build options in the base, not in a package.
- **TypeScript only type-checks** (`tsc --noEmit`). It never emits.
- **No project references.** `tsconfig.base.json` sets `noEmit: true`, and each package has its own flat
  `tsconfig.json` extending it. There's intentionally no root `tsconfig.json`.
- **vitest runs the tests.** There's no separate test tsconfig.
- **Tools are root dev dependencies.** `tsdown`, `vitest`, and `typescript` are declared once at the root and
  resolve into packages through Node's ancestor `node_modules` lookup, which works even with
  `nodeLinker: isolated`.
- **Relative imports use `.ts` extensions**, as in `from './plugin.ts'`. `tsconfig.base.json` sets
  `allowImportingTsExtensions: true` (allowed because `noEmit` is `true`), and tsdown rewrites them to `.js`.
- **Shared versions live in the pnpm catalog** in `pnpm-workspace.yaml` (`typescript`, `tsdown`, `vitest`,
  `@cspell/cspell-types`). Packages reference them with `"catalog:"` so every package stays in lockstep.

## Entry points

- **Two lists, kept in step by hand.** Every published `src/*.ts` file needs both an entry in
  `tsdown.config.ts`'s `entry` and a subpath in `package.json`'s `exports`. tsdown doesn't infer one from the
  other. A file missing from `entry` builds without error and leaves its subpath broken, which only shows when
  something imports it.
- **ESM only, plain extensions.** Build output is `dist/*.js` and `dist/*.d.ts`, one pair per entry. This needs
  `fixedExtension: false` in the shared config. tsdown's default would emit `.mjs`/`.d.mts`, which don't match
  the `main`, `types`, and `exports` fields.

## Dependencies and bundled types

- **Keep `dist` small and production dependencies few.** Both are deliberately optimized. Check `dist` size,
  especially `dist/*.d.ts`, before and after any change to how types or dependencies are shared, and be
  conservative about adding a production `dependencies` entry.
- **`@cspell/cspell-types` is a dev dependency.** tsdown bundles the types of anything that isn't a
  production, peer, or optional dependency into `dist/*.d.ts`, so users get the `Parser`, `Plugin`, and
  `AdvancedCSpellSettings` types without installing it. The shared config sets
  `deps: { onlyBundle: ['@cspell/cspell-types'] }`, so the build fails if some other dependency gets inlined by
  accident. A package that needs another type-only dependency bundled overrides `deps.onlyBundle` in its own
  `mergeConfig` call.
- **Settings types are shared.** Each package's `index.ts` imports `SelectedCSpellSettings` from
  `@internal/utils`. Because `@internal/utils` keeps `@cspell/cspell-types` external, each package's `dist` still
  has one copy of the `@cspell/cspell-types` declarations.

## `@internal/utils`

`packages/internal-utils` is a private workspace package with the logic shared across parser packages: the
plugin API (`createPlugin`, `customizePluginWith`, `createPluginParserWithFilterTags`) and the tag filter engine.

- **A dev dependency, bundled automatically.** A package lists `"@internal/utils": "workspace:*"` under
  `devDependencies`. tsdown bundles a workspace package's code and types without a `deps.onlyBundle` entry, and
  warns if given one.
- **Only what's used is inlined.** tsdown's `.d.ts` bundler inlines only the declarations a package references,
  so adding a type to `@internal/utils` doesn't grow packages that don't use it.
- **Its build emits only `dist/index.d.ts`.** Its `exports` maps `types` to that file and `default` to
  `src/index.ts`, so vitest and tsdown bundle the JS from source, while `tsc` and tsdown's lazy dts read the
  prebuilt declarations. Lazy dts fails with `MISSING_EXPORT` on `.ts` source outside the consumer's own
  program, and `dts: { eager: true }` made builds about three times slower.
- **Rebuild it after changing its exported types**, or consumers typecheck against stale declarations.
- **It keeps `@cspell/cspell-types` external** (`deps.neverBundle`), so each consumer inlines one deduped copy.

## What gets published

- **`files` is `["dist", "!dist/**/*.map"]`.** Without it, npm ships everything not gitignored (`src/`,
  `fixtures/`, `samples/`, ...). npm always includes `package.json`, `README.md`, and `LICENSE`.
- **Source maps stay local.** The shared config sets `sourcemap: true` for debugging from a checkout, and
  `files` keeps the maps out of the tarball.
- **Each package has its own `LICENSE`**, a copy of the root one, since npm only bundles a `LICENSE` inside the
  package.
- **`fix-package-json` sets the rest.** `pnpm run lint` runs it, and it sets these for every package:
  - `repository`, with `directory` pointing at the package. Without it, npm's provenance check fails, because
    the CI attestation expects `repository.url` to match the repo the build ran in.
  - The required `keywords`. The package author adds the language keywords, such as `go` and `golang`.
  - `publishConfig`: public access with provenance.
  - The order of the fields.

## Fixtures and samples

Two directories at each package's root, outside `src/`:

- **`fixtures/`** holds raw source snippets that tests feed straight to a parser. A fixture's exact bytes
  (quote style, spacing, a missing newline) are often what a test checks, so `fixtures/` is excluded from `tsc`
  (tsconfig `exclude`), ESLint (`ignores`), and Prettier (`.prettierignore`). Never let a formatter or linter
  "fix" a fixture.
- **`samples/`** is its own workspace package (registered by `packages/*/samples` in `pnpm-workspace.yaml`),
  with a `workspace:*` dev dependency on the parser package. Each subfolder holds a real cspell config and real,
  correctly spelled source files. Samples are the README's examples, and they prove the plugin works with cspell.
  - `test:cspell` checks them by running `cspell .` from the package root, as part of the package's `test`
    script.
  - Each package has a root `cspell.config.yaml` that ignores `node_modules`, `fixtures`, and `dist`, so
    `cspell .` passes over the whole package. `dist` holds the bundled `@cspell/cspell-types` declarations
    verbatim, typos and all.
