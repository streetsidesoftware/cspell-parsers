# Contributing to @cspell/parser-javascript

This is a contributor-facing note about how this package differs from the usual parser package shape. See
the repo root `CONTRIBUTING.md` for the general shape (`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`,
`samples/`).

## It's a thin alias, not a second implementation

`src/plugin.ts` has no parsing logic of its own. Its plugin holds `@cspell/parser-typescript`'s `javascript`
and `javascriptreact` parsers, the same objects under the same names
(`docs/ADRs/typescript-parser-split/0004-parser-javascript.md`). Loading both plugins is harmless, since the
parsers with those names are identical. Both parsers use the JavaScript grammar, which also reads JSX in a
`.js` file.

`@cspell/parser-typescript` is a real `dependencies` entry (not bundled) in `package.json`. tsdown treats
anything in `dependencies` as external, so `dist/plugin.js` imports it rather than copying that package's code
and its WebAssembly grammars into this package.

## Testing

The parsing behavior is tested in `packages/parser-typescript-tree-sitter-wasm`. What's specific to this
package, and tested here, is: the plugin has exactly the two JavaScript parsers, they're the same objects as
`@cspell/parser-typescript`'s, and `recommended` only covers the JavaScript file types. A few fixture-backed
smoke tests (`fixtures/tags.js`, `fixtures/jsx.jsx`) show the parsers read real JavaScript and JSX.

`samples/` mirrors `@cspell/parser-typescript/samples` with `.js`/`.jsx` files, so `pnpm run test:cspell`
still runs every usage pattern end to end.
