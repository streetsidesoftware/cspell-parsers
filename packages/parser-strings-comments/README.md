# @cspell/parser-strings-comments

One lightweight [cspell](https://cspell.org) plugin that spell checks the prose in your code: comments and strings,
in C, C++, C#, Go, Java, JavaScript, TypeScript, PHP, Python, Ruby, and Rust. A single import covers every language,
and you control what gets checked in each one, from doc comments to heredocs.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects the matching language's parser for every supported file type:

**`cspell.config.jsonc`**

<!--- @@inject: samples/recommended/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-strings-comments/recommended"],
}
```

<!--- @@inject-end: samples/recommended/cspell.config.jsonc#lang=jsonc --->

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose which parser to use for each language ID. Each language has its own parser,
named in the [Supported file types](#supported-file-types) table below:

**`cspell.config.jsonc`**

<!--- @@inject: samples/plugin/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-strings-comments"],
  "languageSettings": [
    {
      "languageId": "php",
      "parser": "php-strings-comments",
    },
  ],
}
```

<!--- @@inject-end: samples/plugin/cspell.config.jsonc#lang=jsonc --->

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

By default, every comment and string is spell checked, and the rest of the code isn't. Use `customizePlugin`
to change what gets checked. For example, to check only comments, in every language:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/comments/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

// Check only comments, in every language.
export default customizePlugin({ tags: { '*': false, comment: true } }).defineConfig();
```

<!--- @@inject-end: samples/comments/cspell.config.mts#lang=ts --->

To change one language only, give it its own parser with `filterTagsForFileType`. For example, to check only
doc comments in C# files, and keep the defaults for the other languages:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/customize/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

// C# files: check only doc comments.
// Other languages: keep the defaults.
export default customizePlugin()
  .filterTagsForFileType(
    'csharp',
    { '*': false, 'comment.block.doc': true, 'comment.line.doc': true },
    'csharp-doc-comments',
  )
  .defineConfig();
```

<!--- @@inject-end: samples/customize/cspell.config.mts#lang=ts --->

**NOTE:**

> Keys in `tags` are matched hierarchically against the [tags](#tags) below. For example, the key `comment`
> also matches the more specific `comment.block.doc`, unless a more specific key overrides it. A key can also
> use `*` as a wildcard, such as `comment.*.doc`, or a bare `*` for everything not otherwise matched.

Calling `customizePlugin` gives you a customized copy of the plugin. Call `defineConfig()` on it to get a
complete cspell config, or keep adjusting it first. Each language has its own parser, named in the
[Supported file types](#supported-file-types) table. For example, to give the PHP parser a different name:

```js
customizePlugin().renameParser('php-strings-comments', 'my-php-parser');
```

### `CustomizePluginOptions`

```ts
interface CustomizePluginOptions {
  /**
   * Define which tagged segments to keep, in every language.
   */
  tags: TagFilterOptions;
}
```

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
| `string.templateLiteral`    | A literal text fragment of a template string (`` `...` ``), excluding `${...}` expressions                                  | `javascript`, `javascriptreact`<br>`typescript`, `typescriptreact`                                                                  |
| `string.textBlock`          | A `"""..."""` text block (Java 15+)                                                                                         | `java`                                                                                                                              |
| `string.tripleQuote`        | A `'''...'''` or `"""..."""` string literal                                                                                 | `python`                                                                                                                            |
| `string.verbatim`           | A `@"..."` verbatim string literal                                                                                          | `csharp`                                                                                                                            |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

### The `code` tag

By default, text tagged `code` (identifiers, keywords, punctuation, ...) isn't spell checked in any language,
and neither is PHP's `html` (markup outside `<?php ... ?>`). To check `code` in every language:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/check-code/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

// Also check code, such as identifiers and keywords, in every language.
export default customizePlugin({ tags: { code: true } }).defineConfig();
```

<!--- @@inject-end: samples/check-code/cspell.config.mts#lang=ts --->

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
