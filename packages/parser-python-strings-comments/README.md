# @cspell/parser-python-strings-comments

A cspell plugin that spell checks only the comments and string literals in Python files, leaving identifiers,
keywords, and the rest of the code alone.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-python-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-python-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "python",
      "parser": "python-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for these cspell language IDs:

| Language ID |
| ----------- |
| `python`    |

### Filtering by tag and file type

By default every comment/string the parser emits gets spell checked. Use `customizePlugin` to change what is sent on to the spell checker.
See also: [Customization options](#customization-options)

**`cspell.config.ts`** or **`cspell.config.mjs`**

```js
import { customizePlugin } from '@cspell/parser-python-strings-comments/plugin';

const customPlugin = customizePlugin({
  // set the parser name to be used in languageSettings
  name: 'python-no-f-strings',
  tags: { '*': true, 'string.interpolated': false }, // skip f-strings
});

export default {
  plugins: [customPlugin],
  languageSettings: [
    {
      // select the customized parser by name, for python files only
      languageId: 'python',
      parser: 'python-no-f-strings',
    },
  ],
};
```

**NOTE:**

> `name` overrides the parser's registered name (`python-strings-comments` by default). This matters when
> registering more than one customized copy of this parser, since cspell selects a parser by name and two
> parsers can't share one.

**NOTE:**

> `tags` keys are matched hierarchically against the [tags](#tags) below.
>
> The key `string` also matches the more specific
> `string.singleQuote` unless a more specific key overrides it. See: [`CustomizePluginOptions`](#customizepluginoptions) and [`TagFilterOptions`](#tagfilteroptions) below.

An f-string's `{...}` interpolation holes are scanned like the rest of the file, so a string or comment
nested inside one keeps its own normal tag rather than `string.interpolated` - filtering out
`string.interpolated` only skips the surrounding literal text, not anything nested inside a hole. A doubled
`{{`/`}}` is treated as a literal brace, not a hole.

## Tags

<!--- @@inject: docs/tags-table.csv#markdown --->

| Tag                   | Meaning                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `comment`             | Any comment                                                                        |
| `comment.line`        | A `#` line comment                                                                 |
| `string`              | Any string-like literal                                                            |
| `string.singleQuote`  | A `'...'` string literal                                                           |
| `string.doubleQuote`  | A `"..."` string literal                                                           |
| `string.tripleQuote`  | A `'''...'''` or `"""..."""` string literal                                        |
| `string.raw`          | Any `r`-prefixed string (`r`, `rb`/`br`, `rf`/`fr`) - composes with the tags above |
| `string.interpolated` | Any `f`-prefixed string (an f-string) - composes with the tags above               |
| `code`                | Everything else (off by default)                                                   |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

### The `code` tag

By default, text tagged `code` is not spell checked. To check it too, use `customizePlugin`:

**`cspell.config.ts`** or **`cspell.config.mjs`**

```js
import { customizePlugin } from '@cspell/parser-python-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { code: true } })],
  languageSettings: [
    {
      languageId: 'python',
      parser: 'python-strings-comments',
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

**Turn off `string.raw`**

```ts
const option = { tags: { 'string.raw': false } };
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

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but means it
can't reliably tell what role a given piece of syntax plays - only what it looks like character-by-character.
Two consequences worth knowing about:

- **Docstrings aren't detected as a distinct category.** A "docstring" is really just a triple-quoted string
  that happens to be the first statement in a module, class, or function body - recognizing that position
  requires real parsing context (knowing you're at the start of a body, not merely seeing three quote
  characters) that this scanner deliberately doesn't have. Every triple-quoted string gets the same
  `string.tripleQuote` tag regardless of where it appears, so `customizePlugin` can't single out docstrings
  specifically - only triple-quoted strings in general.
- **A string prefix is only recognized directly against its opening quote, with a word-boundary check before
  it** (see `CONTRIBUTING.md`), so a prefix always adjacent to its quote is detected correctly; there's no
  attempt to resolve any ambiguity beyond that single check, since Python's grammar doesn't allow anything
  (not even whitespace) between a prefix and its quote.

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
