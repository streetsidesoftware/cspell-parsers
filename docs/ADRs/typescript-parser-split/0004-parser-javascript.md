# 0004. `parser-javascript` is the JavaScript subset of the split

Status: Accepted

## Context

`@cspell/parser-javascript` (published) wraps `@cspell/parser-typescript`'s `parse` as one parser,
`javascript`, for `javascript` and `javascriptreact`. After the split, `parser-typescript`'s own plugin has
`javascript` and `javascriptreact` parsers ([0002](./0002-parser-names.md)). Keeping a single `javascript`
parser for both file types would leave two different parsers with one name, so which one a user gets would
depend on load order. Deprecating the package was the other option.

## Decision

`parser-javascript`'s plugin holds `parser-typescript`'s `javascript` and `javascriptreact` parsers: the same
parser objects, under the same names.

## Consequences

- Loading both plugins is harmless, because parsers with the same name are identical.
- A config that sends `javascriptreact` to `javascript` still works, since the JavaScript grammar handles JSX
  ([0003](./0003-grammars.md)).
- The package stays a thin wrapper. Its tags and filters come from `parser-typescript`.
- It builds its plugin with the wrapped plugin's own builder,
  `customize('javascript').removeParser(['typescript', 'typescriptreact']).build()`, rather than with
  `@internal/utils` directly. Each package bundles its own copy of `@internal/utils`, so a second copy would
  wrap the parsers in new objects and add about 15 KB of JavaScript. `parser-typescript` builds its plugin from
  the WASM backend's the same way.
