# Contributing

Thanks for considering a contribution to cspell-parsers.

## Getting started

```sh
pnpm install
pnpm run build
pnpm test
```

## Adding a new parser package

1. Copy `packages/parser-typescript` to `packages/<your-parser-name>` for the full shape below, or
   `packages/parser-example` if you just want a minimal single-file starting point (bring it in line with
   the full shape before publishing it as a real plugin).
2. Update `package.json`: `name`, `description`, `dependencies`, and the `exports` map for each file you're
   publishing.
3. Implement the parser as four files under `src/`, each with a matching `package.json` `exports` subpath
   and `tsdown.config.ts` entry (see `CLAUDE.md`'s "Package shape" for why both matter):
   - `parser.ts` — `parse(content, filename): ParseResult` and `export const parser: Parser`. This is where
     all the real logic lives.
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
   the package its own root `cspell.config.yaml` (ignoring `node_modules`/`fixtures`) so that passes cleanly.
6. Write `README.md` for someone **using** the plugin, not reading its source — lead with how to add it to a
   cspell config; keep internals secondary.
7. Run `pnpm install` from the repo root to link the new package(s) into the workspace.

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
