# @cspell/parser-rust-strings-comments

A strings-and-comments parser plugin for cspell, covering Rust.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

Unlike [`@cspell/parser-example`](https://www.npmjs.com/package/@cspell/parser-example) (comments only), this
parser only ever emits comments and string-like literals - never identifiers, keywords, punctuation, or char
literals - using a small hand-written scanner rather than a real grammar. It understands Rust's several
string and comment forms: `"..."` strings, `b"..."` byte strings, raw strings (`r"..."`, `r#"..."#`, ...),
line comments (`//`, `///`, `//!`), and block comments (`/* */`, `/** */`, `/*! */`) - including Rust's nested
block comments. Char literals (`'...'`, `b'...'`) are recognized (so they're never mistaken for something
else) but never spell checked - see "How it works" below.

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

`recommended` selects the parser for these cspell language IDs:

| Language ID |
| ----------- |
| `rust`      |

### Filtering by tag

By default every comment/string the parser emits gets spell checked. To check only some of them - for
example, only doc comments - use `customizePlugin` instead of the plain `plugin` export. It takes a
`CustomizePluginOptions` object - `tags: TagFilterOptions` and `name` are both optional, and omitting `tags`
keeps everything - and returns a `Plugin` whose parser filters segments by tag itself, before cspell ever
sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';

export default {
  plugins: [
    customizePlugin({ tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true } }), // only check doc comments
  ],
  languageSettings: [
    {
      languageId: 'rust',
      parser: 'rust-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `comment` also matches the more specific
`comment.line.doc` unless a more specific key overrides it - and may use `*` as a wildcard (`comment.*`, or a
bare `*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table below
for every tag this parser can emit.

`name` overrides the parser's registered name (`rust-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

## Tags

| Tag                  | Meaning                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `comment`            | Any comment                                                                          |
| `comment.line`       | A `//` line comment                                                                  |
| `comment.line.doc`   | A `///` outer doc comment or `//!` inner doc comment line                            |
| `comment.block`      | A `/* ... */` block comment (including a nested one)                                 |
| `comment.block.doc`  | A `/** ... */` outer doc block or `/*! ... */` inner doc block                       |
| `string`             | Any string-like literal                                                              |
| `string.doubleQuote` | A `"..."` string literal or `b"..."` byte string literal                             |
| `string.raw`         | A raw string literal (`r"..."`, `r#"..."#`, ...) or byte raw string (`br"..."`, ...) |

## How it works

- `parser.parse(content, filename)` returns a `ParseResult` containing one or more `ParsedText` entries.
- Each `ParsedText.range` is the `[start, end]` offset of that segment in the original `content`, which is how
  cspell maps spelling issues found in the parsed text back to the right place in the source file.
- Every segment is tagged with a dot-separated tag, plus every ancestor of it (`comment.block.doc` also
  carries `comment` and `comment.block`) - `customizePlugin` can filter which segments get spell checked using
  these tags, at any level of specificity (just `comment`, or the more specific `comment.block.doc`).
- Rust has no string interpolation, so unlike some other languages this repo covers, nothing here ever splits
  into more than one `ParsedText` fragment per literal.
- **Char literals (`'a'`, `'\n'`, `'\x41'`, `'\u{1F600}'`, and their `b'...'` byte-char equivalents) are never
  spell checked.** A single character or escape sequence has no prose worth checking, so this parser
  recognizes the shape of a char literal - distinguishing it from Rust's unrelated `'a` lifetime/label syntax
  - and skips over it entirely, the same way a regex literal is skipped in this repo's JS/TS-family parser.
- `plugin.parsers` is the list of parsers a cspell plugin module exposes; a plugin can expose more than one.

## Known limitations

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but comes
with a few deliberate, documented scope limits:

- **C-string literals are not supported.** Rust 1.77 added `c"..."`/`cr"..."#` (nul-terminated `CStr`
  literals). They're a natural extension of the same raw-string machinery used here, but are left out of this
  first version - a `c"..."` literal is simply not recognized as anything special (it falls through as
  ordinary skipped code), so its content is never spell checked. Add support if you need it - see
  `CONTRIBUTING.md`.
- **The char-literal-vs-lifetime disambiguation only looks one or two characters ahead.** It never scans
  forward speculatively (a lifetime has no closing quote to find), so it's a strictly local decision - see
  `CONTRIBUTING.md` for the exact algorithm. This correctly handles every real Rust char literal and lifetime
  form, but an escape sequence whose closing `'` isn't immediately where expected (essentially, invalid Rust)
  is simply not recognized as a char literal at all - it's treated as an ordinary character instead of being
  skipped as one unit, which is harmless either way since char literals are never spell checked regardless.
- **Nested block comments are fully supported** (`/* /* nested */ still open */` is tracked as one comment,
  per Rust's actual grammar), unlike every C-family language covered elsewhere in this repo.

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
