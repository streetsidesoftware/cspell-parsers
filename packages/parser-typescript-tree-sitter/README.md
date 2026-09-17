# @cspell/parser-typescript-tree-sitter

A [cspell](https://cspell.org) parser plugin for TypeScript (`.ts`, `.mts`, `.cts`) and TSX/JSX (`.tsx`,
`.jsx`) source files. It understands the language well enough to skip things that were never meant to be
read as words — keywords, punctuation, numeric literals — and to leave import specifiers, external package
names, and property access on imported values alone, so it produces fewer false positives than plain
text-based checking.

## Install

```sh
npm install --save-dev @cspell/parser-typescript-tree-sitter
```

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for TypeScript, JavaScript, TSX, and JSX files:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-typescript-tree-sitter/recommended"],
}
```

For more control — for example, to apply it to only some file types, or alongside other settings — wire the
plugin in yourself and choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-typescript-tree-sitter/plugin"],
  "languageSettings": [
    {
      "languageId": "typescript,typescriptreact",
      "parser": "typescript",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for these cspell language IDs:

| Language ID       |
| ----------------- |
| `javascript`      |
| `javascriptreact` |
| `typescript`      |
| `typescriptreact` |

### Filtering by tag

By default every segment the parser emits gets spell checked. To check only some of them — for example, only
comments, or only string content — use `customizePlugin` instead of the plain `plugin` export. It takes a
`CustomizePluginOptions` object (with a `tags: TagFilterOptions` property) and returns a `Plugin` whose
parser filters segments by tag itself, before cspell ever sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-typescript-tree-sitter/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, comment: true } })], // only check comments
  languageSettings: [
    {
      languageId: 'typescript,typescriptreact',
      parser: 'typescript',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below — `comment` also matches the more specific
`comment.block.doc` unless a more specific key overrides it — and may use `*` as a wildcard
(`comment.block.*`, `comment*`, or a bare `*` for "everything not otherwise matched", which defaults to
`true`). See the [Tags](#tags) table below for every tag this parser can emit.

## What it does differently

- Only checks identifiers, string/template contents, comments, and JSX text — never keywords, punctuation,
  or numbers.
- Doesn't flag a package name in an `import`/`export ... from` (`'lodash'`, `'@scope/pkg'`, `'node:fs'`) —
  that's not spelling you authored.
- Doesn't flag a named import's original export name, or properties accessed on an imported value —
  those come from the package being imported, not from your code. A renamed import's local alias, since you
  chose that name, _is_ checked.
- Still checks a local variable or parameter that happens to reuse an import's name, for the scope where it
  shadows that import.
- Tags each checked segment with a dot-separated tag, plus every ancestor of it (`comment.block.doc` also
  carries `comment` and `comment.block`) - `customizePlugin` can filter which segments get spell checked
  using these tags, at any level of specificity. JSX text is checked but carries no tag.

## Tags

| Tag                            | Meaning                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `string`                       | A string literal (fallback for a quote style that's neither `'` nor `"`)                                 |
| `string.singleQuote`           | A `'...'` string literal                                                                                 |
| `string.doubleQuote`           | A `"..."` string literal                                                                                 |
| `string.module`                | A module specifier string literal (fallback for a quote style that's neither `'` nor `"`)                |
| `string.singleQuote.module`    | A `'...'` string literal that is also a module specifier                                                 |
| `string.doubleQuote.module`    | A `"..."` string literal that is also a module specifier                                                 |
| `string.templateLiteral`       | A literal text fragment of a template string (`` `...` ``), excluding `${...}` substitutions             |
| `module`                       | Any module specifier string                                                                              |
| `module.specifier`             | Any module specifier string (same as `module`, for a more specific filter)                               |
| `module.specifier.literal`     | The module specifier string of an `import`/`export ... from` statement or a dynamic `import('...')` call |
| `comment`                      | Any comment                                                                                              |
| `comment.line`                 | A `//` line comment                                                                                      |
| `comment.block`                | A `/* ... */` block comment                                                                              |
| `comment.block.doc`            | A `/** ... */` doc comment                                                                               |
| `identifier`                   | Any identifier                                                                                           |
| `identifier.variable`          | A variable name                                                                                          |
| `identifier.property`          | An object or class property name                                                                         |
| `identifier.privateProperty`   | A `#private` class property name                                                                         |
| `identifier.type`              | A type name                                                                                              |
| `identifier.shorthandProperty` | A shorthand object property name (the `foo` in `{ foo }`)                                                |
| `identifier.label`             | A statement label                                                                                        |
| `identifier.importBinding`     | A renamed import alias, default import name, or namespace import name                                    |
| `identifier.exportBinding`     | A renamed export alias (`export { x as y }`)                                                             |

## Notes

- Ships a native addon (via `tree-sitter`); prebuilt binaries are used automatically on common platforms, so
  no local compiler toolchain should be needed to install it.

## Requirements

<!--- @@inject: ../../static/requirements.md --->

| Tool                                                                                                            | Version    |
| --------------------------------------------------------------------------------------------------------------- | ---------- |
| [cspell](https://cspell.org)                                                                                    | `>=10.0.0` |
| [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | `>=4.4.0`  |

<!--- @@inject-end: ../../static/requirements.md --->

## Support Future Development

<!--- @@inject: ../../static/sponsor.md --->

If our spell checkers and plugins save you time, please consider supporting their development.

Please show your support through one of the following sites:

<p align="left">
  <a href="https://github.com/sponsors/streetsidesoftware" title="GitHub Sponsor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cspell.org/img/sponsor/github-sponsor-dark.png" /><img alt="GitHub Sponsor" src="https://cspell.org/img/sponsor/github-sponsor.png" width="180" /></picture></a> &nbsp; <a href="https://www.paypal.com/donate/?hosted_button_id=26LNBP2Q6MKCY" title="PayPal"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cspell.org/img/sponsor/paypal-dark.png" /><img alt="PayPal" src="https://cspell.org/img/sponsor/paypal.png" width="180" /></picture></a> &nbsp; <a href="https://opencollective.com/cspell" title="Open Collective"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cspell.org/img/sponsor/open-collective-dark.png" /><img alt="Open Collective" src="https://cspell.org/img/sponsor/open-collective.png" width="180" /></picture></a> &nbsp; <a href="https://streetsidesoftware.com/sponsor/" title="Street Side Software"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cspell.org/img/sponsor/cspell-dark.png" /><img alt="CSpell" src="https://cspell.org/img/sponsor/cspell.png" width="180" /></picture></a>
</p>

<!--- @@inject-end: ../../static/sponsor.md --->

## CSpell for Enterprise

<!--- @@inject: ../../static/tidelift.md --->

Available as part of the Tidelift Subscription.

The maintainers of cspell and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source packages you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact packages you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-cspell?utm_source=npm-cspell&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)

<!--- @@inject-end: ../../static/tidelift.md --->

<!--- @@inject: ../../static/footer.md --->

<br/>

---

<p align="center">Brought to you by<a href="https://streetsidesoftware.com" title="Street Side Software"><img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software</a></p>

<!--- @@inject-end: ../../static/footer.md --->
