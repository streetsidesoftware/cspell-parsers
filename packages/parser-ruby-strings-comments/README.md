# @cspell/parser-ruby-strings-comments

A cspell plugin for spell checking only the comments and string literals in Ruby files, leaving identifiers,
keywords, and the rest of the code alone.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-ruby-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-ruby-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "ruby",
      "parser": "ruby-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for this cspell language ID:

| Language ID |
| ----------- |
| `ruby`      |

### Filtering by tag and file type

By default every comment/string the parser emits gets spell checked. Use `customizePlugin` to change what is sent on to the spell checker.
See also: [Customization options](#customization-options)

**`cspell.config.ts`** or **`cspell.config.mjs`**

```js
import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';

const customPlugin = customizePlugin({
  // set the parser name to be used in languageSettings
  name: 'ruby-no-heredocs',
  tags: { 'string.heredoc': false }, // exclude heredocs - often SQL/text blobs
});

export default {
  plugins: [customPlugin],
  languageSettings: [
    {
      // select the customized parser by name, for ruby files only
      languageId: 'ruby',
      parser: 'ruby-no-heredocs',
    },
  ],
};
```

**NOTE:**

> `name` overrides the parser's registered name (`ruby-strings-comments` by default). This matters when
> registering more than one customized copy of this parser, since cspell selects a parser by name and two
> parsers can't share one.

**NOTE:**

> `tags` keys are matched hierarchically against the [tags](#tags) below.
>
> The key `string` also matches the more specific
> `string.heredoc` unless a more specific key overrides it. See: [`CustomizePluginOptions`](#customizepluginoptions) and [`TagFilterOptions`](#tagfilteroptions) below.

A `#{...}` interpolation hole inside a double-quoted string, backtick command string, or interpolated
heredoc is scanned like the rest of the file, so a string or comment nested inside one keeps its own normal
tag rather than the surrounding literal's tag.

## Tags

<!--- @@inject: docs/tags-table.csv#markdown --->

| Tag                  | Meaning                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `comment`            | Any comment                                                              |
| `comment.line`       | A `#` line comment                                                       |
| `comment.block`      | An `=begin` ... `=end` block comment                                     |
| `string`             | Any string-like literal                                                  |
| `string.singleQuote` | A `'...'` string literal                                                 |
| `string.doubleQuote` | A `"..."` string literal (including interpolated fragments)              |
| `string.heredoc`     | A `<<~ID`/`<<-ID`/`<<ID` heredoc body (any of its fragments)             |
| `string.backtick`    | A `` `...` `` backtick command string (including interpolated fragments) |
| `code`               | Everything else (off by default)                                         |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

Regex literals (`/pattern/flags`) and percent-literals (`%w[]`, `%q()`, `%r{}`, ...) never appear in this
table: they're recognized and skipped as opaque units, but nothing is ever spell checked inside either, so
there's no tag to filter by. See [Known limitations](#known-limitations).

### The `code` tag

By default, text tagged `code` is not spell checked. To check it too, use `customizePlugin`:

**`cspell.config.ts`** or **`cspell.config.mjs`**

```js
import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { code: true } })],
  languageSettings: [
    {
      languageId: 'ruby',
      parser: 'ruby-strings-comments',
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

**Turn off `string.backtick`**

```ts
const option = { tags: { 'string.backtick': false } };
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

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but means a
handful of Ruby constructs are deliberately out of scope. See `CONTRIBUTING.md` for the implementation
rationale behind each of these.

- **Regex and percent-literal content is never spell checked**, by design - see the Tags table above.
  Percent-literal recognition only covers a curated set of delimiters (bracket pairs, plus `| ! # / ~ ^`), so
  an exotic delimiter falls back to ordinary code instead.
- **A handful of literal-vs-operator ambiguities are resolved with a heuristic, not full expression
  tracking**: `/regex/` vs. division, `<<heredoc` vs. left-shift, `%w[]` vs. modulo, and `?'` vs. the ternary
  operator. This covers the overwhelming majority of real code, but can still miss a literal passed as a bare
  argument (no parens) to an uncommon method name, a regex spanning multiple lines, or a literal right after
  a `}`.
- **Only one heredoc is supported per line.** Real Ruby allows more code after a heredoc's marker on the same
  line (a second heredoc, a trailing method call); this parser treats the rest of that line as part of the
  heredoc's own unscanned header, so a real string placed there won't be spell checked.
- **Symbols and char literals aren't spell checked.** A bare symbol (`:identifier`) and a char literal
  (`?a`, `?\n`, ...) carry no prose worth checking, so both are skipped as ordinary code - except `?'`,
  `?"`, and `?#`, which are recognized and skipped as a unit so they don't get misread as the start of a real
  string or comment. A quoted symbol (`:"..."`/`:'...'`) is still spell checked, as an ordinary
  double/single-quoted string.
- **A squiggly heredoc's (`<<~ID`) leading-whitespace dedent is not simulated** - the raw, un-dedented body
  text is checked instead, which doesn't affect spelling results.

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
