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

## Tags

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

Regex literals (`/pattern/flags`) and percent-literals (`%w[]`, `%q()`, `%r{}`, ...) never appear in this
table: nothing is ever emitted for either, so there's no tag to filter by - both are already excluded
unconditionally (see "How it works").

## How it works

- `parser.parse(content, filename)` returns a `ParseResult` containing one or more `ParsedText` entries.
- Each `ParsedText.range` is the `[start, end]` offset of that segment in the original `content`, which is how
  cspell maps spelling issues found in the parsed text back to the right place in the source file.
- Every segment is tagged with a dot-separated tag, plus every ancestor of it - `customizePlugin` can filter
  which segments get spell checked using these tags, at any level of specificity.
- A double-quoted string (`"..."`), backtick command string (`` `...` ``), or an interpolated heredoc is
  split into one `ParsedText` per literal fragment around each `#{...}` hole; the hole's own contents are
  recursively scanned the same way as the rest of the file, so a string or comment nested inside an
  interpolation still gets picked up and tagged normally. A backtick command string follows the exact same
  escape/interpolation grammar as a double-quoted string, differing only in delimiter and tag.
- `=begin`/`=end` block comments are only recognized when both markers sit at column 0 - matching Ruby's own
  grammar exactly, so a variable or method merely containing the text "=begin" mid-line is never misdetected
  as opening one.
- **Char literals (`?a`, `?\n`, ...) are never spell checked and get no general recognition at all** - a bare
  `?` is simply left as ordinary, unrecognized code, since a single character has no prose worth checking.
  The one exception is `?'`/`?"`/`?#` (a char literal whose one character is a quote or `#`), which is
  specifically recognized and skipped as a unit - see "Known limitations" for why that one shape needs its
  own handling.
- **Regex literals (`/pattern/flags`) and percent-literals (`%w[]`, `%i[]`, `%q()`, `%Q{}`, `%r{}`, `%s()`,
  `%x()`) are recognized and skipped, but never spell checked at all.** Neither is prose worth checking, so -
  exactly like `@cspell/parser-typescript-strings-comments`'s documented policy for `RegExp` - this parser
  consumes each as a single opaque unit, including any quotes inside it, without ever emitting a `ParsedText`
  for it. This is a deliberate product decision, not an implementation gap - and for percent-literals, also a
  correctness requirement: an _unrecognized_ one containing a quote (`%w[don't stop]`) would otherwise be
  misread as the start of a real string, corrupting everything scanned after it.
- `plugin.parsers` is the list of parsers a cspell plugin module exposes; a plugin can expose more than one.

## Known limitations

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but means a
handful of Ruby constructs are deliberately out of scope for this first version:

- **Regex-literal and percent-literal content is excluded from spell checking entirely**, by design - see
  "How it works" above. Percent-literal recognition only covers a curated set of delimiters (bracket pairs,
  plus `| ! # / ~ ^`) - not every character Ruby technically allows - so an exotic delimiter falls back to
  ordinary code, same failure direction as a missed regex (see below).
- **A squiggly heredoc's (`<<~ID`) leading-whitespace dedent is not simulated.** Real Ruby strips each line's
  common leading whitespace from a `<<~` heredoc's evaluated value; this parser extracts the raw body text
  byte for byte instead, since leading whitespace isn't a word and doesn't affect spell checking.
- **Symbols get no special handling.** A bare symbol (`:identifier`) is just an ordinary `:` followed by an
  ordinary identifier, both silently skipped like any other punctuation/identifier. A quoted symbol
  (`:"..."`/`:'...'`) is spell checked as an ordinary double/single-quoted string - the leading `:` is
  skipped as ordinary punctuation, and the parser's normal quote handling picks up from there.
- **Char literals get no general recognition at all - a bare `?` is otherwise always just ordinary code.**
  Since char literals are never spell checked, there's nothing to gain from parsing their shape. The one
  exception: `?'`, `?"`, and `?#` (a char literal whose one character is a quote or `#`) are specifically
  detected and skipped as a unit, since otherwise that character would be misread as the start of a real
  string or comment, swallowing real code after it - the exact same failure mode an unrecognized
  percent-literal risks (see `CONTRIBUTING.md`).
- **Regex-vs-division, heredoc-vs-left-shift, percent-literal-vs-modulo, and char-literal-vs-ternary are
  resolved with a lightweight, shared heuristic, not full expression tracking.** `/pattern/` vs. `a / b`,
  `<<~ID` vs. `arr << x`, `%w[]` vs. `a % b`, and `?'` vs. `cond ? 'a' : 'b'` all share the same shape: a
  token that either opens a new literal or acts as a binary operator on whatever came before it. This parser
  resolves all four the way a real Ruby lexer does - by looking at the significant token right before it (an
  identifier, a keyword, `)`, `]`, `}`, a closing quote, ...) - using one shared, documented set of
  keywords/method names (`if`, `unless`, `return`, `puts`, `print`, `raise`, ...) after which a new
  expression is expected. This handles the overwhelming majority of real code, but it can still miss:
  - A literal passed as a bare argument (no parens) to a method call not in that keyword set (e.g.
    `some_custom_method /pattern/`) - left as ordinary code (division/left-shift/modulo), not a literal.
  - A regex literal that spans multiple lines - a real but rare Ruby feature this parser doesn't support; it
    stops looking for a regex's closing `/` at the first newline, falling back to treating the `/` as
    ordinary code (and, for any quote inside, the narrower `canPrecedeString` fallback described below).
  - A `/`, `<<`, `%`, or `?` right after a `}` is always treated as an operator, never a literal opener - `}`
    closes both a block (where a literal argument commonly follows) and a hash/argument list (where these are
    real operators), so it's genuinely ambiguous. Biasing toward "operator" is the safe choice: getting it
    wrong just misses a literal, rather than risking a wrongly-recognized one swallowing real code after it.

  When a regex is missed, a quote character inside it falls back to a narrower, per-character mitigation
  (`canPrecedeString`): a quote directly preceded by an identifier character or another quote is never
  mistaken for a real string's start, since valid Ruby syntax could never have one begin there either. This
  doesn't catch every case - a character class that opens with a quote right after `[` (`/['"]/`) is
  genuinely ambiguous with a real string starting right after an array literal's bracket, and is only
  resolved when the regex is actually recognized as one in the first place.

- **A heredoc's opening line is treated as one opaque unit through to its closing marker.** Real Ruby allows
  more code after the marker on the same line (a second heredoc argument, a trailing method call, even
  another heredoc), but this parser does not scan that trailing same-line text for nested comments/strings -
  anything after `<<~ID` up to the end of that line is simply consumed as part of the heredoc's own (unscanned)
  header, the same simplification `@cspell/parser-strings-comments`'s PHP heredoc support already ships. This
  means only one heredoc per line is supported, and a real string literal placed after a heredoc marker on
  the same line won't be spell checked.

Use this package as a template: copy `src/parser.ts`, `src/plugin.ts`, `src/index.ts`, and `src/recommended.ts`
into a new package under `packages/` and replace the parsing logic with your own. See the repo root
`CONTRIBUTING.md` for the full steps.

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
