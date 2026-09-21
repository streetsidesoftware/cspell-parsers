# @cspell/parser-ruby-strings-comments

A strings-and-comments parser plugin for cspell covering Ruby.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

Unlike [`@cspell/parser-example`](https://www.npmjs.com/package/@cspell/parser-example) (comments only) or a
full AST-based parser, this parser only ever emits comments, strings, heredocs, and backtick command strings
(`` `...` ``) - never identifiers, keywords, punctuation, symbols, char literals, regex literals, or
percent-literals (`%w[]`, `%q()`, ...) - using a small hand-written scanner rather than a real grammar.

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

### Filtering by tag

By default every comment/string the parser emits gets spell checked. To check only some of them - for
example, to exclude heredocs, which are often SQL or other text blobs that aren't meant to be spell checked -
use `customizePlugin` instead of the plain `plugin` export. It takes a `CustomizePluginOptions` object -
`tags: TagFilterOptions` and `name` are both optional, and omitting `tags` keeps everything - and returns a
`Plugin` whose parser filters segments by tag itself, before cspell ever sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { 'string.heredoc': false } })], // exclude heredocs
  languageSettings: [
    {
      languageId: 'ruby',
      parser: 'ruby-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.heredoc` unless a more specific key overrides it - and may use `*` as a wildcard (`string.*`, or a
bare `*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table below
for every tag this parser can emit.

`name` overrides the parser's registered name (`ruby-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

A `#{...}` interpolation hole inside a double-quoted string, backtick command string, or interpolated
heredoc is scanned like the rest of the file, so a string or comment nested inside one keeps its own normal
tag rather than the surrounding literal's tag.

## Tags

<!--- @@inject: docs/tags-table.md --->

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

<!--- @@inject-end: docs/tags-table.md --->

Regex literals (`/pattern/flags`) and percent-literals (`%w[]`, `%q()`, `%r{}`, ...) never appear in this
table: they're recognized and skipped as opaque units, but nothing is ever spell checked inside either, so
there's no tag to filter by. See [Known limitations](#known-limitations).

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
