# @cspell/parser-c-cpp-strings-comments

A strings-and-comments parser plugin for cspell, covering C and C++ - these two share identical comment and
string/char-literal syntax (plus C++11 raw strings), so one small scanner handles both.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

Unlike [`@cspell/parser-example`](https://www.npmjs.com/package/@cspell/parser-example) (comments only), this
parser also emits string and char literal contents - but like it, this parser only ever emits comments and
string-like literals - never identifiers, keywords, or punctuation - using a small hand-written scanner
rather than a real grammar.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-c-cpp-strings-comments/recommended"],
}
```

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-c-cpp-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "cpp",
      "parser": "c-cpp-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for these cspell language IDs:

| Language ID |
| ----------- |
| `c`         |
| `cpp`       |

### Filtering by tag

By default every comment/string the parser emits gets spell checked. To check only some of them - for
example, only doc comments - use `customizePlugin` instead of the plain `plugin` export. It takes a
`CustomizePluginOptions` object - `tags: TagFilterOptions` and `name` are both optional, and omitting `tags`
keeps everything - and returns a `Plugin` whose parser filters segments by tag itself, before cspell ever
sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-c-cpp-strings-comments/plugin';

export default {
  // only check Doxygen doc comments - "///"/"//!" lines and "/** ... */" blocks
  plugins: [customizePlugin({ tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true } })],
  languageSettings: [
    {
      languageId: 'cpp',
      parser: 'c-cpp-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.raw` unless a more specific key overrides it - and may use `*` as a wildcard (`string.*`, or a bare
`*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table below for
every tag this parser can emit.

`name` overrides the parser's registered name (`c-cpp-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

## Tags

| Tag                  | Meaning                                           |
| -------------------- | ------------------------------------------------- |
| `comment`            | Any comment                                       |
| `comment.line`       | A `//` line comment                               |
| `comment.line.doc`   | A Doxygen-style `///` or `//!` doc-comment line   |
| `comment.block`      | A `/* ... */` block comment                       |
| `comment.block.doc`  | A `/** ... */` doc comment (Doxygen-style)        |
| `string`             | Any string-like literal                           |
| `string.singleQuote` | A `'...'` char literal                            |
| `string.doubleQuote` | A `"..."` string literal                          |
| `string.raw`         | A C++11 raw string literal (`R"delim(...)delim"`) |

## How it works

- `parser.parse(content, filename)` returns a `ParseResult` containing one or more `ParsedText` entries.
- Each `ParsedText.range` is the `[start, end]` offset of that segment in the original `content`, which is how
  cspell maps spelling issues found in the parsed text back to the right place in the source file.
- Every segment is tagged with a dot-separated tag, plus every ancestor of it (`comment.block.doc` also
  carries `comment` and `comment.block`) - `customizePlugin` can filter which segments get spell checked
  using these tags, at any level of specificity (just `comment`, or the more specific `comment.block.doc`).
- A Doxygen-style doc-comment line - `///` (but not a `////`-or-more separator line) or `//!` - is tagged
  `comment.line.doc`; an ordinary `//` line comment is just `comment.line`.
- **C++11 raw strings (`R"delim(...)delim"`, with an optional `u8`/`u`/`U`/`L` encoding prefix) are
  recognized and their contents spell checked without treating anything inside as an escape sequence or
  comment marker.** `delim` can be 0-16 characters, and the closing sequence must match it exactly
  (`)delim"`), so a near-miss inside the body (e.g. `)DEL` when the real delimiter is `DELIM`) doesn't end the
  string early. Real C code never contains this syntax, so recognizing it is harmless there.
- `plugin.parsers` is the list of parsers a cspell plugin module exposes; a plugin can expose more than one.

## Known limitations

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free. It doesn't
track preprocessor directives (`#if 0` / conditional-compilation blocks are scanned like any other code), so
a comment or string inside a disabled preprocessor branch is still spell checked as if it were live code. It also has no
special handling of multi-line string continuations via a trailing `\` at end-of-line outside of a literal -
only backslash escapes _inside_ a string/char literal are recognized.

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
