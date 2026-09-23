# cspell-parsers

A collection of parser plugins for [cspell](https://cspell.org), published as scoped `@cspell/parser-*`
packages on npm. Each one parses a specific file format for cspell, so spell checking sees only the text
that was meant to be read as words — identifiers, comments, string contents — and skips the rest
(keywords, punctuation, numeric literals, import specifiers, and so on).

## Available parsers

<!--- @@inject: static/packages.csv#markdown --->

| Package                                                                                     | Description                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@cspell/parser-c-cpp-strings-comments`](packages/parser-c-cpp-strings-comments)           | A strings-and-comments parser plugin for cspell covering C and C++.                                                                                    |
| [`@cspell/parser-csharp-strings-comments`](packages/parser-csharp-strings-comments)         | A strings-and-comments parser plugin for cspell covering C#.                                                                                           |
| [`@cspell/parser-go-strings-comments`](packages/parser-go-strings-comments)                 | A strings-and-comments parser plugin for cspell covering Go.                                                                                           |
| [`@cspell/parser-java-strings-comments`](packages/parser-java-strings-comments)             | A strings-and-comments parser plugin for cspell covering Java.                                                                                         |
| [`@cspell/parser-javascript`](packages/parser-javascript)                                   | A JavaScript parser plugin for cspell.                                                                                                                 |
| [`@cspell/parser-php-strings-comments`](packages/parser-php-strings-comments)               | A strings-and-comments parser plugin for cspell covering PHP.                                                                                          |
| [`@cspell/parser-python-strings-comments`](packages/parser-python-strings-comments)         | A strings-and-comments parser plugin for cspell covering Python.                                                                                       |
| [`@cspell/parser-ruby-strings-comments`](packages/parser-ruby-strings-comments)             | A strings-and-comments parser plugin for cspell covering Ruby.                                                                                         |
| [`@cspell/parser-rust-strings-comments`](packages/parser-rust-strings-comments)             | A strings-and-comments parser plugin for cspell covering Rust.                                                                                         |
| [`@cspell/parser-strings-comments`](packages/parser-strings-comments)                       | A combined strings-and-comments parser plugin for cspell covering C, C++, C#, Go, Java, JavaScript, JSX, TypeScript, TSX, PHP, Python, Ruby, and Rust. |
| [`@cspell/parser-typescript`](packages/parser-typescript)                                   | A TypeScript parser plugin for cspell.                                                                                                                 |
| [`@cspell/parser-typescript-strings-comments`](packages/parser-typescript-strings-comments) | A strings-and-comments parser plugin for cspell covering JavaScript, JSX, TypeScript, and TSX.                                                         |
| [`@cspell/parser-typescript-tree-sitter`](packages/parser-typescript-tree-sitter)           | A TypeScript parser plugin for cspell using tree-sitter's native Node.js bindings.                                                                     |
| [`@cspell/parser-typescript-tree-sitter-wasm`](packages/parser-typescript-tree-sitter-wasm) | A TypeScript parser plugin for cspell using tree-sitter compiled to WebAssembly (no native build step).                                                |

<!--- @@inject-end: static/packages.csv#markdown --->

See each package's own README for install instructions, usage, and — where the parser emits `tags` — the
table of tags it can produce, for filtering with `customizePlugin`.

## Choosing a parser

- **Check identifiers too** — [`@cspell/parser-typescript`](packages/parser-typescript) checks identifiers,
  comments, and strings in JavaScript, JSX, TypeScript, and TSX, and skips keywords and import specifiers.
  [`@cspell/parser-javascript`](packages/parser-javascript) is the same parser, registered for JavaScript and
  JSX only.
- **Comments and strings only** — the `*-strings-comments` packages leave code alone and check only comments
  and string literals. Pick the one for your language, or
  [`@cspell/parser-strings-comments`](packages/parser-strings-comments) to cover all of them at once.
- **tree-sitter backend** — `@cspell/parser-typescript` is built on
  [`@cspell/parser-typescript-tree-sitter-wasm`](packages/parser-typescript-tree-sitter-wasm) (WebAssembly, no
  native build step). Use [`@cspell/parser-typescript-tree-sitter`](packages/parser-typescript-tree-sitter)
  directly for tree-sitter's native Node.js bindings instead.

## Requirements

<!--- @@inject: ./static/requirements.md --->

| Tool                                                                                                            | Version    |
| --------------------------------------------------------------------------------------------------------------- | ---------- |
| [cspell](https://cspell.org)                                                                                    | `>=10.0.0` |
| [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | `>=4.4.0`  |

<!--- @@inject-end: ./static/requirements.md --->

## Quick start

Every parser package works the same way. Install it:

```sh
npm install --save-dev @cspell/parser-typescript
```

Then import its `recommended` settings to register the plugin and select it for the relevant file types in
one step:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-typescript/recommended"],
}
```

For more control — applying a parser to only some file types, or alongside other settings — wire the plugin
in yourself instead; see the package's README for the exact `languageId`s and parser name to use.

## Contributing

Want to add a new parser, or work on one of the ones here? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

## Support Future Development

<!--- @@inject: static/sponsor.md --->

If our spell checkers and plugins save you time, please consider supporting their development.

Please show your support through one of the following sites:

<p align="left">
  <a href="https://github.com/sponsors/streetsidesoftware" title="GitHub Sponsor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://streetsidesoftware.com/img/sponsor/github-sponsor-dark.png" /><img alt="GitHub Sponsor" src="https://streetsidesoftware.com/img/sponsor/github-sponsor.png" width="180" /></picture></a> &nbsp; <a href="https://www.paypal.com/donate/?hosted_button_id=26LNBP2Q6MKCY" title="PayPal"><picture><source media="(prefers-color-scheme: dark)" srcset="https://streetsidesoftware.com/img/sponsor/paypal-dark.png" /><img alt="PayPal" src="https://streetsidesoftware.com/img/sponsor/paypal.png" width="180" /></picture></a> &nbsp; <a href="https://opencollective.com/cspell" title="Open Collective"><picture><source media="(prefers-color-scheme: dark)" srcset="https://streetsidesoftware.com/img/sponsor/open-collective-dark.png" /><img alt="Open Collective" src="https://streetsidesoftware.com/img/sponsor/open-collective.png" width="180" /></picture></a> &nbsp; <a href="https://streetsidesoftware.com/sponsor/" title="Street Side Software"><picture><source media="(prefers-color-scheme: dark)" srcset="https://streetsidesoftware.com/img/sponsor/cspell-dark.png" /><img alt="CSpell" src="https://streetsidesoftware.com/img/sponsor/cspell.png" width="180" /></picture></a>
</p>

<!--- @@inject-end: static/sponsor.md --->

<!--- @@inject: static/footer.md --->

<br/>

---

<p align="center">Brought to you by<a href="https://streetsidesoftware.com" title="Street Side Software"><img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software</a></p>

<!--- @@inject-end: static/footer.md --->
