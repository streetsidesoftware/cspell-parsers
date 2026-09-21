# @cspell/parser-php-strings-comments

A cspell plugin that extracts PHP comments and string-like literals for spell checking. Unlike this repo's
other language parsers, it checks the whole file by default, not just comments and strings: the HTML
surrounding a `<?php ... ?>` block is tagged `html`, and any PHP code that isn't a comment or string
(identifiers, keywords, punctuation, ...) is tagged `code` - so nothing is silently skipped, but both can be
filtered out with `customizePlugin` (see below) if you don't want them checked.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-php-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-php-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "php",
      "parser": "php-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for this cspell language ID:

| Language ID |
| ----------- |
| `php`       |

### Filtering by tag

By default every segment the parser emits gets spell checked. To check only some of them - for example,
skipping the surrounding HTML markup - use `customizePlugin`
instead of the plain `plugin` export. It takes a `CustomizePluginOptions` object - `tags: TagFilterOptions`
and `name` are both optional, and omitting `tags` keeps everything - and returns a `Plugin` that only spell
checks the tagged segments you keep. It works with any cspell version.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': true, html: false } })], // skip HTML outside <?php ?>
  languageSettings: [
    {
      languageId: 'php',
      parser: 'php-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.heredoc` unless a more specific key overrides it - and may use `*` as a wildcard (`string.*`, or a
bare `*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table below
for every tag this parser can emit.

`name` overrides the parser's registered name (`php-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

## Tags

<!--- @@inject: docs/tags-table.md --->

| Tag                  | Meaning                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `comment`            | Any comment                                                                                           |
| `comment.line`       | A `//` or `#` line comment (`#[` starts a PHP 8 attribute, not a comment)                             |
| `comment.block`      | A `/* ... */` block comment                                                                           |
| `comment.block.doc`  | A `/** ... */` PHPDoc-style comment                                                                   |
| `string`             | Any string-like literal                                                                               |
| `string.singleQuote` | A `'...'` string literal (no interpolation)                                                           |
| `string.doubleQuote` | A `"..."` string literal (interpolation-aware)                                                        |
| `string.heredoc`     | A `<<<ID ... ID` heredoc body (interpolation-aware)                                                   |
| `string.nowdoc`      | A `<<<'ID' ... ID` nowdoc body (no interpolation)                                                     |
| `html`               | HTML (or other non-PHP) content outside `<?php`/`<?=`/`<?` ... `?>`                                   |
| `code`               | PHP code that isn't a comment or string (identifiers, keywords, punctuation, numbers, tag delimiters) |

<!--- @@inject-end: docs/tags-table.md --->

## Known limitations

This parser is a small hand-written scanner, not a real grammar. It resolves complex interpolation
(`{$...}`) well enough to find the correct end of the surrounding string, but doesn't understand PHP
expressions inside the hole beyond tracking brace depth and skipping any nested `'...'`/`"..."` quoted
strings - which is enough for every real-world case this parser targets, since the hole's contents are
always spell checked as part of the same string rather than parsed separately.

Simple interpolation (a bare `$name` or `$arr[key]` without `{}`) isn't specially recognized at all - it's
just ordinary text inside the double-quoted string or heredoc it appears in, which is exactly what should
happen: it's still spell checked as part of the surrounding string content.

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
