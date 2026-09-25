# @cspell/parser-php-strings-comments

A cspell plugin that spell checks only the comments and string literals in PHP files. The HTML around a
`<?php ... ?>` block (`html`) and everything else (`code`) are skipped by default. Use `customizePlugin` to
[check them too](#checking-html-and-code).

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

**`cspell.config.jsonc`**

```jsonc
{
  "import": ["@cspell/parser-php-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

**`cspell.config.jsonc`**

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

The plugin provides these parsers. Where Recommended is `yes`, `recommended` enables the named parser for
files with that Language ID:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID | Parser Name          | Recommended |
| ----------- | -------------------- | ----------- |
| php         | php-strings-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

## Filtering by tag

By default, every comment and string is spell checked, and the HTML and the rest of the code aren't. Use
`customizePlugin` to change what gets checked. For example, to check only PHPDoc comments:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/doc-comments-only/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

// Check only PHPDoc comments.
export default customizePlugin({ tags: { '*': false, 'comment.block.doc': true } }).defineConfig();
```

<!--- @@inject-end: samples/doc-comments-only/cspell.config.mts#lang=ts --->

**NOTE:**

> Keys in `tags` are matched hierarchically against the [tags](#tags) below. For example, the key `string`
> also matches the more specific `string.heredoc`, unless a more specific key overrides it. A key can also use
> `*` as a wildcard, such as `string.*`, or a bare `*` for everything not otherwise matched.

Calling `customizePlugin` gives you a customized copy of the plugin. Call `defineConfig()` on it to get a
complete cspell config, or keep adjusting it first. For example, to give the parser a different name:

```js
customizePlugin().renameParser('php-strings-comments', 'my-php-parser');
```

## Checking HTML and code

The HTML outside `<?php ... ?>` (`html`) and everything else (`code`) are off by default. To check the HTML
too:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/customize/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

// Also check the HTML outside <?php ... ?> blocks.
export default customizePlugin({ tags: { html: true } }).defineConfig();
```

<!--- @@inject-end: samples/customize/cspell.config.mts#lang=ts --->

To check both:

```js
customizePlugin({ tags: { html: true, code: true } });
```

## Tags

Each part of a file gets its most specific tag plus the more general ones above it. For example, a PHPDoc
comment is tagged `comment.block.doc`, `comment.block`, and `comment`, so a filter can use whichever level it
needs.

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

## Special cases

- **Variables inside a string are checked as part of that string.** In a double-quoted string or a heredoc,
  interpolated variables and expressions such as `$name` and `{$user->name}` are spell checked along with the
  rest of the string's text.
  <!--- Tested by src/parser.test.ts: "interpolated variables stay in the string text" --->

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
