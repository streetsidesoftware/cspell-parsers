# Contributing to @cspell/parser-javascript

This is a contributor-facing note about how this package differs from the usual parser package shape. See
the repo root `CONTRIBUTING.md` for the general shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`,
`fixtures/`, `samples/`).

## It's a thin alias, not a second implementation

Unlike every other package in this repo, `src/parser.ts` has no parsing logic of its own — it imports `parse`
straight from `@cspell/parser-typescript/parser` and re-exports it unchanged:

```ts
export { parse } from '@cspell/parser-typescript/parser';
```

The only things this package adds are:

- A `Parser` object named `'javascript'` instead of `'typescript'` (see `src/parser.ts`), so a consumer
  wiring `languageSettings` writes `parser: 'javascript'` rather than having to know this is secretly the
  TypeScript implementation.
- A narrower `supportedFileTypes` — `['javascript', 'javascriptreact']` instead of all four TS/JS language
  IDs — which is the single source of truth `recommended.ts` builds its `languageSettings` from, same as
  every other package here.

Because `parse` itself is untouched, this package's `parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts` still
follow the same four-file shape and `exports` map as every other package (see root `CLAUDE.md`'s "Package
shape"), and `customizePlugin` still works, since it's generic over any `Plugin`/`Parser` (see
`@internal/utils`).

`@cspell/parser-typescript` is listed as a real `dependencies` entry (not bundled) in `package.json`, and
`tsdown.config.ts` doesn't need an `onlyBundle` entry for it: tsdown automatically treats anything in
`dependencies`/`peerDependencies` as external, so `dist/parser.js` keeps a plain
`import { parse } from '@cspell/parser-typescript/parser'` rather than duplicating that package's code (and
its `tree-sitter` native addon) into this one's published tarball.

## Testing

Since there's no real parsing logic here, `parser.test.ts` doesn't need the same exhaustive fixture coverage
as `@cspell/parser-typescript/src/parser.test.ts` (import shadowing, module-specifier handling, etc.) — that
behavior is already covered there, and this package would just be re-testing the same code through an extra
layer of indirection. What's actually specific to this package, and worth testing here, is: the parser is
named `'javascript'`, `parse` is the exact function re-exported from `@cspell/parser-typescript`, and
`supportedFileTypes` only lists the JavaScript/JSX language IDs — plus a couple of fixture-backed smoke tests
(`fixtures/tags.js`, `fixtures/jsx.jsx`) proving the pass-through actually parses real content.

`samples/` mirrors `@cspell/parser-typescript/samples` (`plugin/`, `recommended/`, `customize/`) with the
`.ts`/`.tsx` fixtures swapped for `.js`/`.jsx`, so `pnpm run test:cspell` still exercises every usage pattern
end-to-end.
