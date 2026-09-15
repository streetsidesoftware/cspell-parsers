# Contributing

Thanks for considering a contribution to cspell-parsers.

## Getting started

```sh
pnpm install
pnpm run build
pnpm test
```

## Adding a new parser package

1. Copy `packages/parser-example` to `packages/<your-parser-name>`.
2. Update `package.json` (`name`, `dependencies`) and implement your parser in `src/index.ts`, exporting a
   `Parser` and a `Plugin` from `@cspell/cspell-types`.
3. Write tests in `src/*.test.ts` with [vitest](https://vitest.dev).
4. Run `pnpm install` from the repo root to link the new package into the workspace.

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
