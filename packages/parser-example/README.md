# @cspell/parser-example

Starter parser package for the cspell-parsers monorepo.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

The example parser extracts C-style comments - `//` line comments and `/*`-delimited block comments - out of
arbitrary source text, so only comment text (not code) gets spell checked. It skips over quoted string
contents, so a comment marker inside a string literal (`"see http://example.com"`) isn't mistaken for the
start of a real comment.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for a handful of C-style languages (C, C++, C#, Java, JavaScript, TypeScript):

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-example/recommended"],
}
```

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-example/plugin"],
  "languageSettings": [
    {
      "languageId": "c,cpp",
      "parser": "c-style-comments",
    },
  ],
}
```

## Supported file types

The plugin provides these parsers for these cspell language IDs; `recommended` selects the one marked Recommended:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID | Parser           | Recommended |
| ----------- | ---------------- | ----------- |
| c           | c-style-comments | yes         |
| cpp         | c-style-comments | yes         |
| csharp      | c-style-comments | yes         |
| java        | c-style-comments | yes         |
| javascript  | c-style-comments | yes         |
| typescript  | c-style-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

### Filtering by tag

By default every comment the parser emits gets spell checked. To check only some of them — for example, only
doc comments — use `customizePlugin` instead of the plain `plugin` export. It takes a
`CustomizePluginOptions` object — `tags: TagFilterOptions` and `name` are both optional, and omitting `tags`
keeps everything — and returns a `Plugin` that only spell checks the tagged segments you keep. This filtering
works with any cspell version.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-example/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true } })], // only check doc comments
  languageSettings: [
    {
      languageId: 'c,cpp',
      parser: 'c-style-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below — `comment` also matches the more specific
`comment.block.doc` unless a more specific key overrides it — and may use `*` as a wildcard (`comment.block.*`,
or a bare `*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table
below for every tag this parser can emit.

`name` overrides the parser's registered name (`c-style-comments` by default). This matters when registering
more than one customized copy of this parser, since cspell selects a parser by name and two parsers can't
share one.

## Tags

<!--- @@inject: docs/tags-table.csv#markdown --->

| Tag                 | Meaning                     |
| ------------------- | --------------------------- |
| `comment`           | Any comment                 |
| `comment.line`      | A `//` line comment         |
| `comment.block`     | A `/* ... */` block comment |
| `comment.block.doc` | A `/** ... */` doc comment  |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

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
  <a href="https://github.com/sponsors/streetsidesoftware" title="GitHub Sponsor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://streetsidesoftware.com/img/sponsor/github-sponsor-dark.png" /><img alt="GitHub Sponsor" src="https://streetsidesoftware.com/img/sponsor/github-sponsor.png" width="180" /></picture></a> &nbsp; <a href="https://www.paypal.com/donate/?hosted_button_id=26LNBP2Q6MKCY" title="PayPal"><picture><source media="(prefers-color-scheme: dark)" srcset="https://streetsidesoftware.com/img/sponsor/paypal-dark.png" /><img alt="PayPal" src="https://streetsidesoftware.com/img/sponsor/paypal.png" width="180" /></picture></a> &nbsp; <a href="https://opencollective.com/cspell" title="Open Collective"><picture><source media="(prefers-color-scheme: dark)" srcset="https://streetsidesoftware.com/img/sponsor/open-collective-dark.png" /><img alt="Open Collective" src="https://streetsidesoftware.com/img/sponsor/open-collective.png" width="180" /></picture></a> &nbsp; <a href="https://streetsidesoftware.com/sponsor/" title="Street Side Software"><picture><source media="(prefers-color-scheme: dark)" srcset="https://streetsidesoftware.com/img/sponsor/cspell-dark.png" /><img alt="CSpell" src="https://streetsidesoftware.com/img/sponsor/cspell.png" width="180" /></picture></a>
</p>

<!--- @@inject-end: ../../static/sponsor.md --->

<!--- @@inject: ../../static/footer.md --->

<br/>

---

<p align="center">Brought to you by<a href="https://streetsidesoftware.com" title="Street Side Software"><img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software</a></p>

<!--- @@inject-end: ../../static/footer.md --->
