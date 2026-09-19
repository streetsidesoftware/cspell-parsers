# @cspell/parser-rust-strings-comments

A strings-and-comments parser plugin for cspell, covering Rust.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

Unlike [`@cspell/parser-example`](https://www.npmjs.com/package/@cspell/parser-example) (comments only), this
parser only ever emits comments and string-like literals - never identifiers, keywords, punctuation, char
literals, or lifetimes - using a small hand-written scanner rather than a real grammar. It understands
Rust's several string and comment forms: `"..."` strings, `b"..."` byte strings, raw strings (`r"..."`,
`r#"..."#`, ...), line comments (`//`, `///`, `//!`), and block comments (`/* */`, `/** */`, `/*! */`) -
including Rust's nested block comments. Char literals (`'...'`, `b'...'`) are never spell checked and get no
special handling at all - see "How it works" and "Known limitations" below for what that trades off.

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

| Tag                 | Meaning                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `comment`           | Any comment                                                                         |
| `comment.line`      | A `//` line comment                                                                 |
| `comment.line.doc`  | A `///` outer doc comment or `//!` inner doc comment line                           |
| `comment.block`     | A `/* ... */` block comment (including a nested one)                                |
| `comment.block.doc` | A `/** ... */` outer doc block or `/*! ... */` inner doc block                      |
| `string`            | Any string-like literal, including a plain `"..."` string                           |
| `string.byte`       | A `b"..."` byte string literal (also carried by `string.byte.raw`)                  |
| `string.raw`        | A raw string literal (`r"..."`, `r#"..."#`, ...) - not a byte raw string, see below |
| `string.byte.raw`   | A byte raw string literal (`br"..."`, `br#"..."#`, ...)                             |

## How it works

- `parser.parse(content, filename)` returns a `ParseResult` containing one or more `ParsedText` entries.
- Each `ParsedText.range` is the `[start, end]` offset of that segment in the original `content`, which is how
  cspell maps spelling issues found in the parsed text back to the right place in the source file.
- Every segment is tagged with a dot-separated tag, plus every ancestor of it (`comment.block.doc` also
  carries `comment` and `comment.block`) - `customizePlugin` can filter which segments get spell checked using
  these tags, at any level of specificity (just `comment`, or the more specific `comment.block.doc`).
- Rust has no string interpolation, so unlike some other languages this repo covers, nothing here ever splits
  into more than one `ParsedText` fragment per literal.
- **String tags describe the string's _kind_, not its quote style.** Rust only ever uses `"` for strings, so
  there's no `string.singleQuote`/`.doubleQuote` distinction to make the way some other languages in this
  repo do. Instead a plain `"..."` string gets just the bare `string` tag, and each other kind adds its own
  descriptor: `string.byte` for a `b"..."` byte string, `string.raw` for a raw string, and
  `string.byte.raw` for a byte raw string (carrying `string.byte` as an ancestor too, so filtering on
  `string.byte` alone matches both).
- **Char literals (`'a'`, `'\n'`, `'\x41'`, `'\u{1F600}'`, and their `b'...'` byte-char equivalents) and
  lifetimes/labels (`'a`, `'static`, `'_`) are never spell checked and get no general recognition at all.** A
  bare `'` is simply left as ordinary, unrecognized code - a single character or escape sequence has no prose
  worth checking, so there's no need to parse a char literal's shape just to decide not to emit it. The one
  exception is `'"'` (a char literal whose content is a `"`), which is specifically recognized and skipped as
  a unit - see "Known limitations" for why that one case needs its own handling.
- `plugin.parsers` is the list of parsers a cspell plugin module exposes; a plugin can expose more than one.

## Known limitations

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but comes
with a few deliberate, documented scope limits:

- **C-string literals are not supported.** Rust 1.77 added `c"..."`/`cr"..."#` (nul-terminated `CStr`
  literals). They're a natural extension of the same raw-string machinery used here, but are left out of this
  first version - a `c"..."` literal is simply not recognized as anything special (it falls through as
  ordinary skipped code), so its content is never spell checked. Add support if you need it - see
  `CONTRIBUTING.md`.
- **Char literals and lifetimes get no general recognition at all - a bare `'` is otherwise always just
  ordinary code.** This is a deliberate simplification: since char literals are never spell checked, there's
  nothing to gain from correctly parsing their shape. The one exception is `'"'` (a char literal whose
  content is a `"`): without recognizing it as a single unit, the `"` right after its opening `'` would look
  exactly like the start of a real string, which would then scan past the literal's actual closing `'`
  looking for another `"` - potentially swallowing real code (including a genuine string) in between. This
  one shape is specifically detected and skipped as a unit to avoid that; every other char literal and every
  lifetime still gets no special handling, since nothing else risks the same failure mode - see
  `CONTRIBUTING.md` for the full rationale.
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
