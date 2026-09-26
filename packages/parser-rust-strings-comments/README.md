# @cspell/parser-rust-strings-comments

A lightweight Rust parser for [cspell](https://cspell.org) that spell checks the prose in your code: comments
and strings. It has no dependencies, and it gives you control over what gets checked, from doc comments to raw,
byte, and C strings.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

**`cspell.config.jsonc`**

<!--- @@inject: samples/recommended/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-rust-strings-comments/recommended"],
}
```

<!--- @@inject-end: samples/recommended/cspell.config.jsonc#lang=jsonc --->

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and choose
the language IDs to use it for:

**`cspell.config.jsonc`**

<!--- @@inject: samples/plugin/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-rust-strings-comments"],
  "languageSettings": [
    {
      "languageId": "rust",
      "parser": "rust-strings-comments",
    },
  ],
}
```

<!--- @@inject-end: samples/plugin/cspell.config.jsonc#lang=jsonc --->

## Supported file types

The plugin provides these parsers. Where Recommended is `yes`, `recommended` enables the named parser for
files with that Language ID:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID | Parser Name           | Recommended |
| ----------- | --------------------- | ----------- |
| rust        | rust-strings-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

## Filtering by tag

By default, every comment and string is spell checked, and the rest of the code isn't. Use `customizePlugin`
to change what gets checked. For example, to check only doc comments:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/customize/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';

// Check only doc comments.
export default customizePlugin({
  tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true },
}).defineConfig();
```

<!--- @@inject-end: samples/customize/cspell.config.mts#lang=ts --->

**NOTE:**

> Keys in `tags` are matched hierarchically against the [tags](#tags) below. For example, the key `string`
> also matches the more specific `string.raw`, unless a more specific key overrides it. A key can also use
> `*` as a wildcard, such as `comment.*`, or a bare `*` for everything not otherwise matched.

Calling `customizePlugin` gives you a customized copy of the plugin. Call `defineConfig()` on it to get a
complete cspell config, or keep adjusting it first. For example, to give the parser a different name:

```js
customizePlugin().renameParser('rust-strings-comments', 'my-rust-parser');
```

## Tags

Each part of a file gets its most specific tag plus the more general ones above it. For example, a `///` doc
comment is tagged `comment.line.doc`, `comment.line`, and `comment`, so a filter can use whichever level it
needs.

<!--- @@inject: docs/tags-table.csv#markdown --->

| Tag                 | Meaning                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `comment`           | Any comment                                                                   |
| `comment.line`      | A `//` line comment                                                           |
| `comment.line.doc`  | A `///` outer doc comment or `//!` inner doc comment line                     |
| `comment.block`     | A `/* ... */` block comment (including a nested one)                          |
| `comment.block.doc` | A `/** ... */` outer doc block or `/*! ... */` inner doc block                |
| `string`            | Any string-like literal, including a plain `"..."` string                     |
| `string.byte`       | A `b"..."` byte string literal (also carried by `string.byte.raw`)            |
| `string.raw`        | A raw string literal (`r"..."`, `r#"..."#`, ...) - not a byte or C raw string |
| `string.byte.raw`   | A byte raw string literal (`br"..."`, `br#"..."#`, ...)                       |
| `string.c`          | A `c"..."` C string literal (also carried by `string.c.raw`)                  |
| `string.c.raw`      | A C raw string literal (`cr"..."`, `cr#"..."#`, ...)                          |
| `code`              | Everything else (off by default)                                              |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

Rust only uses `"` for strings, so a string's tags describe its kind (byte, raw, or C) rather than its quote
style. A nested block comment, such as `/* outer /* inner */ still outer */`, is one comment.

<!--- Tested by src/parsers.test.ts: "treats "/* /* nested */ still open */" as ONE comment, not two" --->

### The `code` tag

By default, keywords, identifiers, and everything else tagged `code` aren't spell checked. To check them too:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/check-code/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';

// Also check code, such as identifiers and keywords.
export default customizePlugin({ tags: { code: true } }).defineConfig();
```

<!--- @@inject-end: samples/check-code/cspell.config.mts#lang=ts --->

## Customization options

Use `customizePlugin(options)` to control which parts of a file get spell checked, based on the [tags](#tags)
the parser gives each part.

### `CustomizePluginOptions`

```ts
interface CustomizePluginOptions {
  /**
   * Define which tagged segments to keep.
   */
  tags: TagFilterOptions;
}
```

### Examples

**Everything including `code`**

```ts
const option = { tags: { '*': true } };
```

**Everything except `code`**

```ts
const option = { tags: { '*': true, code: false } };
```

**Only comments**

```ts
const option = { tags: { '*': false, comment: true } };
```

**Turn off byte strings**

```ts
const option = { tags: { 'string.byte': false } };
```

### `TagFilterOptions`

Use `TagFilterOptions` to set the filter criteria for the text sent to the spell checker.

The values are inherited hierarchically

- `comment: false` also implies `comment.line` is `false` unless overwritten by `'comment.line': true`

Wildcards

- `*` wildcards are weak matches. A more specific match will win.

```ts
/**
 * A tag name, or a `*`-wildcard pattern matching one.
 */
type TagPattern = string;

interface TagFilterOptions {
  /**
   * The default filter setting for any tag not otherwise matched.
   */
  '*'?: boolean | undefined;

  /**
   * Filter setting for the specific tag or wildcard pattern.
   *
   * If not specified, the default (`'*'`) will be used.
   */
  [tag: TagPattern]: boolean | undefined;
}
```

## Known limitations

- **Char literals aren't checked.** A char literal such as `'a'` or `b'x'` is code, the same as a lifetime.
  <!--- Tested by src/parsers.test.ts: "does not emit anything for a char literal ("'A'") - char literals are never spell checked" --->

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
