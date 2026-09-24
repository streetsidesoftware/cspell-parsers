# @cspell/parser-php-strings-comments

A cspell plugin that spell checks only the comments and string literals in PHP files. The HTML around a
`<?php ... ?>` block (`html`) and everything else (`code`) are skipped by default - use `customizePlugin` to
[opt into checking them](#checking-html-and-code).

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

The plugin provides these parsers. Where Recommended is `yes`, `recommended` enables the named parser for files with that Language ID:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID | Parser Name          | Recommended |
| ----------- | -------------------- | ----------- |
| php         | php-strings-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

### Filtering by tag

By default every comment and string gets spell checked, and `html` and `code` don't. To change which tagged
segments get checked - for example, only PHPDoc comments - use `customizePlugin` instead of the plain `plugin`
export. It takes a `CustomizePluginOptions` object - `tags: TagFilterOptions` and `name` are both optional,
and omitting `tags` keeps the defaults - and returns a `Plugin` that only spell checks the tagged segments you
keep. It works with any cspell version.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true } })], // only PHPDoc comments
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
bare `*` for "everything not otherwise matched"; without one, each tag keeps its default). See the [Tags](#tags) table below
for every tag this parser can emit.

`name` overrides the parser's registered name (`php-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

### Checking HTML and code

`html` (markup outside `<?php ... ?>`) and `code` (everything else) are off by default.
Opt into either, or both, with `customizePlugin`:

```js
// cspell.config.mjs
import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { html: true, code: true } })],
  languageSettings: [
    {
      languageId: 'php',
      parser: 'php-strings-comments',
    },
  ],
};
```

## Tags

<!--- @@inject: docs/tags-table.csv#markdown --->

| Tag                  | Meaning                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `comment`            | Any comment                                                                          |
| `comment.line`       | A `//` or `#` line comment (`#[` starts a PHP 8 attribute, not a comment)            |
| `comment.block`      | A `/* ... */` block comment                                                          |
| `comment.block.doc`  | A `/** ... */` PHPDoc-style comment                                                  |
| `string`             | Any string-like literal                                                              |
| `string.singleQuote` | A `'...'` string literal (no interpolation)                                          |
| `string.doubleQuote` | A `"..."` string literal (interpolation-aware)                                       |
| `string.heredoc`     | A `<<<ID ... ID` heredoc body (interpolation-aware)                                  |
| `string.nowdoc`      | A `<<<'ID' ... ID` nowdoc body (no interpolation)                                    |
| `html`               | HTML (or other non-PHP) content outside `<?php`/`<?=`/`<?` ... `?>` (off by default) |
| `code`               | Everything else (off by default)                                                     |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

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
