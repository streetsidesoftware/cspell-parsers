# @cspell/parser-rust-strings-comments

A cspell plugin for spell checking only the comments and string literals in Rust files, leaving identifiers,
keywords, and the rest of the code alone.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-rust-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-rust-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "rust",
      "parser": "rust-strings-comments",
    },
  ],
}
```

## Supported file types

The plugin provides these parsers for these cspell language IDs; `recommended` selects the one marked Recommended:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID | Parser                | Recommended |
| ----------- | --------------------- | ----------- |
| rust        | rust-strings-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

### Filtering by tag and file type

By default every comment/string the parser emits gets spell checked. Use `customizePlugin` to change what is sent on to the spell checker.
See also: [Customization options](#customization-options)

**`cspell.config.ts`** or **`cspell.config.mjs`**

```js
import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';

const customPlugin = customizePlugin({
  // set the parser name to be used in languageSettings
  name: 'rust-no-raw-strings',
  tags: { 'string.raw': false }, // exclude raw strings - often regex/SQL blobs
});

export default {
  plugins: [customPlugin],
  languageSettings: [
    {
      // select the customized parser by name, for rust files only
      languageId: 'rust',
      parser: 'rust-no-raw-strings',
    },
  ],
};
```

**NOTE:**

> `name` overrides the parser's registered name (`rust-strings-comments` by default). This matters when
> registering more than one customized copy of this parser, since cspell selects a parser by name and two
> parsers can't share one.

**NOTE:**

> `tags` keys are matched hierarchically against the [tags](#tags) below.
>
> The key `string` also matches the more specific
> `string.raw` unless a more specific key overrides it. See: [`CustomizePluginOptions`](#customizepluginoptions) and [`TagFilterOptions`](#tagfilteroptions) below.

## Tags

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

Since Rust only ever uses `"` for strings, string tags describe a literal's _kind_ (byte/raw/C) rather than
quote style.

### The `code` tag

By default, text tagged `code` is not spell checked. To check it too, use `customizePlugin`:

**`cspell.config.ts`** or **`cspell.config.mjs`**

```js
import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { code: true } })],
  languageSettings: [
    {
      languageId: 'rust',
      parser: 'rust-strings-comments',
    },
  ],
};
```

## Customization options

The customization options have two purposes:

- Change the name of the registered parser (not the plugin's own name)
- Set up a `tags` filter to specify what is passed to the spell checker based upon
  the attributed tags.

### `CustomizePluginOptions`

```ts
interface CustomizePluginOptions {
  /**
   * Set the name of the parser. Does not change the plugin's own name.
   */
  name?: string;
  /**
   * Define which tagged segments to keep. Omit to keep the parser's own defaults (`code` excluded).
   */
  tags?: TagFilterOptions;
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

Change the parser `name` to `only-comments` and allow only comments.

```ts
const option = { name: 'only-comments', tags: { '*': false, comment: true } };
```

**Turn off `string.byte`**

```ts
const option = { tags: { 'string.byte': false } };
```

### `TagFilterOptions`

`TagFilterOptions` are used to set the filter criteria for the text sent to the spell checker.

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

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but comes
with one deliberate, documented scope limit:

- **Char literals and lifetimes get no general recognition at all - a bare `'` is otherwise always just
  ordinary code.** Since char literals are never spell checked, there's nothing to gain from parsing their
  shape. The one exception: a char literal containing a `"` (`'"'` or `'\"'`) is specifically detected and
  skipped as a unit, since otherwise that embedded `"` would be misread as the start of a real string,
  swallowing real code (potentially including a genuine string) up to the next `"` in the file. See
  `CONTRIBUTING.md` for the full rationale.

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
