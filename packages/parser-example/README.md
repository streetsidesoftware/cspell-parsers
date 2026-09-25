# @cspell/parser-example

A starter parser package for the cspell-parsers monorepo. It spell checks only the comments in C-style
source files: `//` line comments and `/* ... */` block comments. String literals and the rest of the code
are skipped, and a comment marker inside a string, such as `"see http://example.com"`, isn't mistaken for a
real comment.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

**`cspell.config.jsonc`**

```jsonc
{
  "import": ["@cspell/parser-example/recommended"],
}
```

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose the language IDs to use it for:

**`cspell.config.jsonc`**

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

The plugin provides these parsers. Where Recommended is `yes`, `recommended` enables the named parser for
files with that Language ID:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID | Parser Name      | Recommended |
| ----------- | ---------------- | ----------- |
| c           | c-style-comments | yes         |
| cpp         | c-style-comments | yes         |
| csharp      | c-style-comments | yes         |
| java        | c-style-comments | yes         |
| javascript  | c-style-comments | yes         |
| typescript  | c-style-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

## Filtering by tag

By default, every comment is spell checked, and the rest of the code isn't. Use `customizePlugin` to change
what gets checked. For example, to check only doc comments:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/customize/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-example/plugin';

// Check only doc comments.
const customPlugin = customizePlugin({ tags: { '*': false, 'comment.block.doc': true } });

export default {
  plugins: [customPlugin],
  languageSettings: customPlugin.languageSettings(),
};
```

<!--- @@inject-end: samples/customize/cspell.config.mts#lang=ts --->

**NOTE:**

> Keys in `tags` are matched hierarchically against the [tags](#tags) below. For example, the key `comment`
> also matches the more specific `comment.block.doc`, unless a more specific key overrides it. A key can also
> use `*` as a wildcard, such as `comment.*`, or a bare `*` for everything not otherwise matched.

Calling `customizePlugin` gives you a customized copy of the plugin. You can add it to `plugins` straight
away, or keep adjusting it first. For example, to give the parser a different name:

```js
customizePlugin({ tags: { '*': false, comment: true } }).renameParser('c-style-comments', 'c-comments-only');
```

## Checking code

Everything that isn't a comment, including string literals, is tagged `code` and is off by default. To check
it too:

```js
customizePlugin({ tags: { code: true } });
```

## Tags

Each part of a file gets its most specific tag plus the more general ones above it. For example, a doc
comment is tagged `comment.block.doc`, `comment.block`, and `comment`, so a filter can use whichever level it
needs.

<!--- @@inject: docs/tags-table.csv#markdown --->

| Tag                 | Meaning                          |
| ------------------- | -------------------------------- |
| `comment`           | Any comment                      |
| `comment.line`      | A `//` line comment              |
| `comment.block`     | A `/* ... */` block comment      |
| `comment.block.doc` | A `/** ... */` doc comment       |
| `code`              | Everything else (off by default) |

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
