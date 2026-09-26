# @cspell/parser-ruby-strings-comments

A lightweight Ruby parser for [cspell](https://cspell.org) that spell checks the prose in your code: comments
and strings. It has no dependencies, and it gives you control over what gets checked, from `=begin` blocks to
heredocs and interpolated strings.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

**`cspell.config.jsonc`**

<!--- @@inject: samples/recommended/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-ruby-strings-comments/recommended"],
}
```

<!--- @@inject-end: samples/recommended/cspell.config.jsonc#lang=jsonc --->

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and choose
the language IDs to use it for:

**`cspell.config.jsonc`**

<!--- @@inject: samples/plugin/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-ruby-strings-comments"],
  "languageSettings": [
    {
      "languageId": "ruby",
      "parser": "ruby-strings-comments",
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
| ruby        | ruby-strings-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

## Filtering by tag

By default, every comment and string is spell checked, and the rest of the code isn't. Use `customizePlugin`
to change what gets checked. For example, to skip heredocs, which often hold SQL or other text:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/customize/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';

// Skip heredocs, which often hold SQL or other text.
export default customizePlugin({ tags: { 'string.heredoc': false } }).defineConfig();
```

<!--- @@inject-end: samples/customize/cspell.config.mts#lang=ts --->

**NOTE:**

> Keys in `tags` are matched hierarchically against the [tags](#tags) below. For example, the key `string`
> also matches the more specific `string.heredoc`, unless a more specific key overrides it. A key can also use
> `*` as a wildcard, such as `comment.*`, or a bare `*` for everything not otherwise matched.

Calling `customizePlugin` gives you a customized copy of the plugin. Call `defineConfig()` on it to get a
complete cspell config, or keep adjusting it first. For example, to give the parser a different name:

```js
customizePlugin().renameParser('ruby-strings-comments', 'my-ruby-parser');
```

## Tags

Each part of a file gets its most specific tag plus the more general ones above it. For example, a heredoc is
tagged `string.heredoc` and `string`, so a filter can use whichever level it needs.

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

In a double-quoted string, backtick command string, or interpolated heredoc, the code in each `#{...}` hole
is scanned like any other code, so a string inside it keeps its own tag rather than the surrounding string's.

<!--- Tested by src/parsers.test.ts: "keeps a string nested in a #{...} hole under its own tag, not the surrounding string's" --->

Regex literals (`/pattern/flags`) and percent-literals (`%w[]`, `%q()`, `%r{}`, ...) have no tag of their own.
They're part of the surrounding `code`, so they're checked only when `code` is.

<!--- Tested by src/parsers.test.ts: "leaves regex and percent-literal content in code, with no tag of its own" --->
<!--- Tested by src/parsers.test.ts: "emits only the file's comments and its two real strings - nothing from inside any regex" --->
<!--- Tested by src/parsers.test.ts: "emits only the comment and the one real string - nothing from inside any percent-literal" --->

### The `code` tag

By default, keywords, identifiers, and everything else tagged `code` aren't spell checked. To check them too:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/check-code/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';

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

**Turn off backtick command strings**

```ts
const option = { tags: { 'string.backtick': false } };
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

- **Some literals are told apart from operators by a heuristic.** This covers `/regex/` vs. division,
  `<<heredoc` vs. left shift, `%w[]` vs. modulo, and `?'` vs. the ternary operator. It handles almost all real
  code, but a literal passed as a bare argument (no parentheses) to an uncommon method, a regex spanning
  several lines, or a literal right after a `}` can be read as code, and then it isn't checked.
  <!--- Tested by src/parsers.test.ts: "does not mistake ordinary division (identifier, number, call, paren, bracket) for a regex" --->
  <!--- Tested by src/parsers.test.ts: "treats a same-line "}" as division/append-like, so a real string right after it is never swallowed" --->
  <!--- Tested by src/parsers.test.ts: "does treat "puts <<~MSG" (a whitelisted bare method call) as a heredoc opener" --->
- **Only one heredoc is checked per line.** Anything after a heredoc's marker on the same line, such as a
  second heredoc or a string argument, isn't checked.
  <!--- Tested by src/parsers.test.ts: "does not check a second heredoc or a string after a heredoc marker on the same line" --->
- **Symbols and char literals aren't checked.** A bare symbol (`:name`) and a char literal (`?a`) are code. A
  quoted symbol (`:"..."` or `:'...'`) is checked as a string.
  <!--- Tested by src/parsers.test.ts: "skips a bare symbol but checks a quoted symbol as a string" --->
  <!--- Tested by src/parsers.test.ts: "does not emit anything for a plain char literal ("?a")" --->

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
