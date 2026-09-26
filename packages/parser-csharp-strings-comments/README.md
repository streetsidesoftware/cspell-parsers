# @cspell/parser-csharp-strings-comments

A lightweight C# parser for [cspell](https://cspell.org) that spell checks the prose in your code: comments and
strings. It has no dependencies, and it gives you control over what gets checked, from XML doc comments to
interpolated and raw strings.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

**`cspell.config.jsonc`**

<!--- @@inject: samples/recommended/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-csharp-strings-comments/recommended"],
}
```

<!--- @@inject-end: samples/recommended/cspell.config.jsonc#lang=jsonc --->

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and choose
the language IDs to use it for:

**`cspell.config.jsonc`**

<!--- @@inject: samples/plugin/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-csharp-strings-comments"],
  "languageSettings": [
    {
      "languageId": "csharp",
      "parser": "csharp-strings-comments",
    },
  ],
}
```

<!--- @@inject-end: samples/plugin/cspell.config.jsonc#lang=jsonc --->

## Supported file types

The plugin provides these parsers. Where Recommended is `yes`, `recommended` enables the named parser for
files with that Language ID:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID | Parser Name             | Recommended |
| ----------- | ----------------------- | ----------- |
| csharp      | csharp-strings-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

## Filtering by tag

By default, every comment and string is spell checked, and the rest of the code isn't. Use `customizePlugin`
to change what gets checked. For example, to check only XML doc comments:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/customize/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-csharp-strings-comments/plugin';

// Check only XML doc comments.
export default customizePlugin({ tags: { '*': false, 'comment.line.doc': true } }).defineConfig();
```

<!--- @@inject-end: samples/customize/cspell.config.mts#lang=ts --->

**NOTE:**

> Keys in `tags` are matched hierarchically against the [tags](#tags) below. For example, the key `string`
> also matches the more specific `string.raw`, unless a more specific key overrides it. A key can also use `*`
> as a wildcard, such as `comment.*.doc`, or a bare `*` for everything not otherwise matched.

Calling `customizePlugin` gives you a customized copy of the plugin. Call `defineConfig()` on it to get a
complete cspell config, or keep adjusting it first. For example, to give the parser a different name:

```js
customizePlugin().renameParser('csharp-strings-comments', 'my-csharp-parser');
```

## Tags

Each part of a file gets its most specific tag plus the more general ones above it. For example, a `///` XML
doc comment is tagged `comment.line.doc`, `comment.line`, and `comment`, so a filter can use whichever level
it needs.

<!--- @@inject: docs/tags-table.csv#markdown --->

| Tag                   | Meaning                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| `comment`             | Any comment                                                                      |
| `comment.line`        | A `//` line comment                                                              |
| `comment.line.doc`    | A `///` XML doc comment line (not a `////`-or-more separator line)               |
| `comment.block`       | A `/* ... */` block comment                                                      |
| `comment.block.doc`   | A `/** ... */` doc-style block comment (not a conventional C# form, but handled) |
| `string`              | Any string-like literal                                                          |
| `string.singleQuote`  | A `'...'` character literal                                                      |
| `string.doubleQuote`  | A `"..."` string literal                                                         |
| `string.verbatim`     | A `@"..."` verbatim string literal                                               |
| `string.interpolated` | A `$"..."` interpolated string literal fragment                                  |
| `string.raw`          | A C# 11 `"""..."""` raw string literal                                           |
| `code`                | Everything else (off by default)                                                 |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

A string can have two string tags. A `$@"..."` or `@$"..."` string is tagged both `string.verbatim` and
`string.interpolated`. An interpolated raw string is tagged both `string.raw` and `string.interpolated`.

<!--- Tested by src/parsers.test.ts: "splits a combined $@ verbatim-interpolated string, keeping doubled quotes literal" --->
<!--- Tested by src/parsers.test.ts: "treats $@ and @$ prefixes identically" --->

In an interpolated string, the code in each `{...}` hole is scanned like any other code, so a string or comment
inside it is checked and tagged as usual. Doubled braces, `{{` and `}}`, are literal braces.

<!--- Tested by src/parsers.test.ts: "recurses into a {...} hole to find the nested string literals in a ternary's branches" --->
<!--- Tested by src/parsers.test.ts: "recognizes a comment nested inside an interpolation hole" --->
<!--- Tested by src/parsers.test.ts: "keeps doubled {{ and }} as literal braces, not the start of a hole" --->

### The `code` tag

By default, keywords, identifiers, and everything else tagged `code` aren't spell checked. To check them too:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/check-code/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-csharp-strings-comments/plugin';

// Also check code, such as identifiers and keywords.
export default customizePlugin({ tags: { code: true } }).defineConfig();
```

<!--- @@inject-end: samples/check-code/cspell.config.mts#lang=ts --->

<!--- @@inject: ../../static/customization-options-intro.md#value=given-by:parser gives each part. --->

## Customization options

Use `customizePlugin(options)` to control which parts of a file get spell checked, based on the [tags](#tags)
the parser gives each part.

### `CustomizePluginOptions`

```ts
interface CustomizePluginOptions {
  /** Chooses which tagged segments every parser keeps. */
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

<!--- @@inject-end: ../../static/customization-options-intro.md#value=given-by:parser gives each part. --->

**Turn off `comment.*.doc`**

```ts
const option = { tags: { 'comment.*.doc': false } };
```

<!--- @@inject: ../../static/customization-options-tag-filter.md --->

### `TagFilterOptions`

Use `TagFilterOptions` to set the filter criteria for the text sent to the spell checker.

The values are inherited hierarchically:

- `comment: false` also implies `comment.line` is `false` unless overridden by `'comment.line': true`

Wildcards:

- `*` wildcards are weak matches. A more specific match will win.

```ts
/**
 * A tag name, or a `*`-wildcard pattern matching one.
 */
type TagPattern = string;

interface TagFilterOptions {
  /**
   * The default filter setting for any tag not otherwise matched.
   * @default true
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

<!--- @@inject-end: ../../static/customization-options-tag-filter.md --->

## Known limitations

- **Raw strings keep their indentation.** The leading indentation a raw string shares with its closing
  delimiter isn't removed, so each line's text includes it.
  <!--- Tested by src/parsers.test.ts: "recognizes a plain (3-quote) raw string literal" --->
- **An interpolated raw string is checked as one piece.** Its `{...}` holes aren't scanned as code, so any
  names in them are spell checked as part of the string.
  <!--- Tested by src/parsers.test.ts: "does not split an interpolated raw string's {...} hole into its own segment (documented simplification)" --->

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
