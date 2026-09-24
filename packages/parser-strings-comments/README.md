# @cspell/parser-strings-comments

A cspell plugin that spell checks only the comments and string literals in C, C++, C#, Go, Java, JavaScript,
JSX, TypeScript, TSX, PHP, Python, Ruby, and Rust files, leaving identifiers, keywords, and the rest of the
code alone. It bundles this repo's per-language strings-and-comments parsers into one plugin, so a single
import covers every language they support.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects the matching language's parser for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-strings-comments/recommended"],
}
```

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose which parser to use for each language ID. Each language has its own parser,
named in the [Supported file types](#supported-file-types) table below:

```jsonc
{
  "plugins": ["@cspell/parser-strings-comments/plugin"],
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

| Language ID     | Parser Name                 | Recommended |
| --------------- | --------------------------- | ----------- |
| c               | c-cpp-strings-comments      | yes         |
| cpp             | c-cpp-strings-comments      | yes         |
| csharp          | csharp-strings-comments     | yes         |
| go              | go-strings-comments         | yes         |
| java            | java-strings-comments       | yes         |
| javascript      | typescript-strings-comments | yes         |
| javascriptreact | typescript-strings-comments | yes         |
| php             | php-strings-comments        | yes         |
| python          | python-strings-comments     | yes         |
| ruby            | ruby-strings-comments       | yes         |
| rust            | rust-strings-comments       | yes         |
| typescript      | typescript-strings-comments | yes         |
| typescriptreact | typescript-strings-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

Each parser is also published on its own, and its README documents its known limitations:

| Language ID(s)                                           | Package                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| c, cpp                                                   | [`@cspell/parser-c-cpp-strings-comments`](https://www.npmjs.com/package/@cspell/parser-c-cpp-strings-comments)           |
| csharp                                                   | [`@cspell/parser-csharp-strings-comments`](https://www.npmjs.com/package/@cspell/parser-csharp-strings-comments)         |
| go                                                       | [`@cspell/parser-go-strings-comments`](https://www.npmjs.com/package/@cspell/parser-go-strings-comments)                 |
| java                                                     | [`@cspell/parser-java-strings-comments`](https://www.npmjs.com/package/@cspell/parser-java-strings-comments)             |
| php                                                      | [`@cspell/parser-php-strings-comments`](https://www.npmjs.com/package/@cspell/parser-php-strings-comments)               |
| python                                                   | [`@cspell/parser-python-strings-comments`](https://www.npmjs.com/package/@cspell/parser-python-strings-comments)         |
| ruby                                                     | [`@cspell/parser-ruby-strings-comments`](https://www.npmjs.com/package/@cspell/parser-ruby-strings-comments)             |
| rust                                                     | [`@cspell/parser-rust-strings-comments`](https://www.npmjs.com/package/@cspell/parser-rust-strings-comments)             |
| javascript, javascriptreact, typescript, typescriptreact | [`@cspell/parser-typescript-strings-comments`](https://www.npmjs.com/package/@cspell/parser-typescript-strings-comments) |

## Filtering by tag

Every parser tags each segment it emits (`comment.line`, `string.doubleQuote`, ...). Use `customizePlugin`
to choose which tagged segments get spell checked. It takes the language ID to customize (or `'*'` for all of
them) and a `CustomizePluginOptions` object, and returns a `Plugin` with the customized parsers.

`customizePlugin` returns a live `Plugin` object, not a module-specifier string, so it only works from a JS/TS
cspell config (`cspell.config.mjs`/`.mts`/`.ts`/`.cjs`) - not `.json`/`.jsonc`/`.yaml`, where `plugins` can
only be a list of strings.

**Only comments, in every language**

```js
// cspell.config.mjs
import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

const plugin = customizePlugin('*', { tags: { '*': false, comment: true } });

export default {
  plugins: [plugin],
  // select each language's (customized) parser, the same as `recommended` does
  languageSettings: plugin.recommendedLanguageSettings,
};
```

**Only doc comments, in C# only**

```js
// cspell.config.mjs
import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

export default {
  plugins: [
    customizePlugin('csharp', {
      // the parser name to use in languageSettings
      name: 'csharp-only-docs',
      tags: { '*': false, 'comment.block.doc': true, 'comment.line.doc': true },
    }),
  ],
  languageSettings: [
    {
      languageId: 'csharp',
      parser: 'csharp-only-docs',
    },
  ],
};
```

### `CustomizePluginOptions`

```ts
interface CustomizePluginOptions {
  /**
   * Name for the customized plugin and parser. Ignored for the parsers when customizing `'*'`,
   * since two parsers can't share one name.
   */
  name?: string;
  /**
   * Tagged segments to keep. Omit to keep each parser's own defaults.
   */
  tags?: TagFilterOptions;
}
```

`tags` keys are matched hierarchically - `comment: false` also turns off `comment.line` unless
`'comment.line': true` overrides it - and may use `*` as a wildcard (`string.*`, or a bare `*` for
"everything not otherwise matched"). A more specific key always wins over a wildcard.

## Tags

Every tag the bundled parsers can emit. A tag whose meaning differs between languages has one row per variant.

<!--- @@inject: docs/tags-table.csv#markdown --->

| Tag                         | Meaning                                                                                                                     | Languages                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `code`                      | Everything else (off by default)                                                                                            | all                                                                                                                                 |
| `comment`                   | Any comment                                                                                                                 | all                                                                                                                                 |
| `comment.block`             | A `/* ... */` block comment                                                                                                 | `c`, `cpp`, `csharp`, `go`, `java`<br>`javascript`, `javascriptreact`<br>`php`, `typescript`<br>`typescriptreact`                   |
| `comment.block`             | An `=begin` ... `=end` block comment                                                                                        | `ruby`                                                                                                                              |
| `comment.block`             | A `/* ... */` block comment (including a nested one)                                                                        | `rust`                                                                                                                              |
| `comment.block.doc`         | A `/** ... */` doc comment (Doxygen-style)                                                                                  | `c`, `cpp`                                                                                                                          |
| `comment.block.doc`         | A `/** ... */` doc-style block comment (not a conventional C# form, but handled)                                            | `csharp`                                                                                                                            |
| `comment.block.doc`         | A `/** ... */` doc comment (rare in idiomatic Go, which favors plain `//` comments for godoc)                               | `go`                                                                                                                                |
| `comment.block.doc`         | A `/** ... */` Javadoc comment                                                                                              | `java`                                                                                                                              |
| `comment.block.doc`         | A `/** ... */` doc comment (JSDoc-style)                                                                                    | `javascript`, `javascriptreact`<br>`typescript`, `typescriptreact`                                                                  |
| `comment.block.doc`         | A `/** ... */` PHPDoc-style comment                                                                                         | `php`                                                                                                                               |
| `comment.block.doc`         | A `/** ... */` outer doc block or `/*! ... */` inner doc block                                                              | `rust`                                                                                                                              |
| `comment.line`              | A `//` line comment                                                                                                         | `c`, `cpp`, `csharp`, `go`, `java`<br>`javascript`, `javascriptreact`<br>`rust`, `typescript`<br>`typescriptreact`                  |
| `comment.line`              | A `//` or `#` line comment (`#[` starts a PHP 8 attribute, not a comment)                                                   | `php`                                                                                                                               |
| `comment.line`              | A `#` line comment                                                                                                          | `python`, `ruby`                                                                                                                    |
| `comment.line.doc`          | A Doxygen-style `///` or `//!` doc-comment line                                                                             | `c`, `cpp`                                                                                                                          |
| `comment.line.doc`          | A `///` XML doc comment line (not a `////`-or-more separator line)                                                          | `csharp`                                                                                                                            |
| `comment.line.doc`          | A `///` outer doc comment or `//!` inner doc comment line                                                                   | `rust`                                                                                                                              |
| `html`                      | HTML (or other non-PHP) content outside `<?php`/`<?=`/`<?` ... `?>` (off by default)                                        | `php`                                                                                                                               |
| `module`                    | Any module specifier string                                                                                                 | `javascript`, `javascriptreact`<br>`typescript`, `typescriptreact`                                                                  |
| `module.specifier`          | Any module specifier string (same as `module`, for a more specific filter)                                                  | `javascript`, `javascriptreact`<br>`typescript`, `typescriptreact`                                                                  |
| `module.specifier.literal`  | The module specifier string of an `import`/`export ... from` statement, a dynamic `import('...')`, or a `require(...)` call | `javascript`, `javascriptreact`<br>`typescript`, `typescriptreact`                                                                  |
| `string`                    | Any string-like literal                                                                                                     | `c`, `cpp`, `csharp`, `go`, `java`<br>`javascript`, `javascriptreact`<br>`php`, `python`, `ruby`<br>`typescript`, `typescriptreact` |
| `string`                    | Any string-like literal, including a plain `"..."` string                                                                   | `rust`                                                                                                                              |
| `string.backtick`           | A `` `...` `` backtick command string (including interpolated fragments)                                                    | `ruby`                                                                                                                              |
| `string.byte`               | A `b"..."` byte string literal (also carried by `string.byte.raw`)                                                          | `rust`                                                                                                                              |
| `string.byte.raw`           | A byte raw string literal (`br"..."`, `br#"..."#`, ...)                                                                     | `rust`                                                                                                                              |
| `string.c`                  | A `c"..."` C string literal (also carried by `string.c.raw`)                                                                | `rust`                                                                                                                              |
| `string.c.raw`              | A C raw string literal (`cr"..."`, `cr#"..."#`, ...)                                                                        | `rust`                                                                                                                              |
| `string.doubleQuote`        | A `"..."` string literal                                                                                                    | `c`, `cpp`, `csharp`, `java`<br>`javascript`, `javascriptreact`<br>`python`, `typescript`<br>`typescriptreact`                      |
| `string.doubleQuote`        | A `"..."` interpreted string literal                                                                                        | `go`                                                                                                                                |
| `string.doubleQuote`        | A `"..."` string literal (interpolation-aware)                                                                              | `php`                                                                                                                               |
| `string.doubleQuote`        | A `"..."` string literal (including interpolated fragments)                                                                 | `ruby`                                                                                                                              |
| `string.doubleQuote.module` | A `"..."` string literal that is also a module specifier                                                                    | `javascript`, `javascriptreact`<br>`typescript`, `typescriptreact`                                                                  |
| `string.heredoc`            | A `<<<ID ... ID` heredoc body (interpolation-aware)                                                                         | `php`                                                                                                                               |
| `string.heredoc`            | A `<<~ID`/`<<-ID`/`<<ID` heredoc body (any of its fragments)                                                                | `ruby`                                                                                                                              |
| `string.interpolated`       | A `$"..."` interpolated string literal fragment                                                                             | `csharp`                                                                                                                            |
| `string.interpolated`       | Any `f`-prefixed string (an f-string) - composes with the tags above                                                        | `python`                                                                                                                            |
| `string.nowdoc`             | A `<<<'ID' ... ID` nowdoc body (no interpolation)                                                                           | `php`                                                                                                                               |
| `string.raw`                | A C++11 raw string literal (`R"delim(...)delim"`)                                                                           | `c`, `cpp`                                                                                                                          |
| `string.raw`                | A C# 11 `"""..."""` raw string literal                                                                                      | `csharp`                                                                                                                            |
| `string.raw`                | A `` `...` `` raw string literal                                                                                            | `go`                                                                                                                                |
| `string.raw`                | Any `r`-prefixed string (`r`, `rb`/`br`, `rf`/`fr`) - composes with the tags above                                          | `python`                                                                                                                            |
| `string.raw`                | A raw string literal (`r"..."`, `r#"..."#`, ...) - not a byte or C raw string                                               | `rust`                                                                                                                              |
| `string.singleQuote`        | A `'...'` char literal                                                                                                      | `c`, `cpp`                                                                                                                          |
| `string.singleQuote`        | A `'...'` character literal                                                                                                 | `csharp`, `java`                                                                                                                    |
| `string.singleQuote`        | A `'...'` rune literal                                                                                                      | `go`                                                                                                                                |
| `string.singleQuote`        | A `'...'` string literal                                                                                                    | `javascript`, `javascriptreact`<br>`python`, `ruby`, `typescript`<br>`typescriptreact`                                              |
| `string.singleQuote`        | A `'...'` string literal (no interpolation)                                                                                 | `php`                                                                                                                               |
| `string.singleQuote.module` | A `'...'` string literal that is also a module specifier                                                                    | `javascript`, `javascriptreact`<br>`typescript`, `typescriptreact`                                                                  |
| `string.templateLiteral`    | A literal text fragment of a template string (`` `...` ``), excluding `${...}` holes                                        | `javascript`, `javascriptreact`<br>`typescript`, `typescriptreact`                                                                  |
| `string.textBlock`          | A `"""..."""` text block (Java 15+)                                                                                         | `java`                                                                                                                              |
| `string.tripleQuote`        | A `'''...'''` or `"""..."""` string literal                                                                                 | `python`                                                                                                                            |
| `string.verbatim`           | A `@"..."` verbatim string literal                                                                                          | `csharp`                                                                                                                            |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

### The `code` tag

By default, text tagged `code` (identifiers, keywords, punctuation, ...) is not spell checked in any language,
and neither is PHP's `html` (markup outside `<?php ... ?>`). To check `code` in every language:

```js
// cspell.config.mjs
import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

const plugin = customizePlugin('*', { tags: { code: true } });

export default {
  plugins: [plugin],
  languageSettings: plugin.recommendedLanguageSettings,
};
```

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
