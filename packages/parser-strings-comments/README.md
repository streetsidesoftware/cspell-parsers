# @cspell/parser-strings-comments

A combined strings-and-comments parser plugin for cspell, covering C, C++, C#, Go, Java, JavaScript, JSX,
TypeScript, TSX, and PHP - the languages in this family share enough comment/string syntax that one parser
can handle all of them, extension by extension, including each language's own extra forms (JSDoc/Javadoc/
PHPDoc/C# XML doc comments, JS/TS template literals, C# verbatim/interpolated/raw strings, Java/C# text
blocks, C++/Go raw strings, and PHP heredoc/nowdoc).

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

Unlike [`@cspell/parser-example`](https://www.npmjs.com/package/@cspell/parser-example) (comments only) or
[`@cspell/parser-typescript`](https://www.npmjs.com/package/@cspell/parser-typescript) (a full TypeScript/TSX
AST parser that also checks identifiers), this parser only ever emits comments and string-like literals -
never identifiers, keywords, or punctuation - and does it with a single hand-written scanner shared across
every supported language, rather than a per-language grammar.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-strings-comments/recommended"],
}
```

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "php",
      "parser": "strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for these cspell language IDs:

| Language ID       |
| ----------------- |
| `c`               |
| `cpp`             |
| `csharp`          |
| `go`              |
| `java`            |
| `javascript`      |
| `javascriptreact` |
| `php`             |
| `typescript`      |
| `typescriptreact` |

### Filtering by tag

By default every comment/string the parser emits gets spell checked. To check only some of them - for
example, only doc comments - use `customizePlugin` instead of the plain `plugin` export. It takes a
`CustomizePluginOptions` object - `tags: TagFilterOptions` and `name` are both optional, and omitting `tags`
keeps everything - and returns a `Plugin` whose parser filters segments by tag itself, before cspell ever
sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

export default {
  // only check doc comments (JSDoc/Javadoc/PHPDoc-style "/**" blocks and C#'s "///" lines)
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true, 'comment.line.doc': true } })],
  languageSettings: [
    {
      languageId: 'csharp',
      parser: 'strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.heredoc` unless a more specific key overrides it - and may use `*` as a wildcard (`string.*`, or a
bare `*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table below
for every tag this parser can emit.

`name` overrides the parser's registered name (`strings-comments` by default). This matters when registering
more than one customized copy of this parser, since cspell selects a parser by name and two parsers can't
share one.

## Tags

| Tag                      | Meaning                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `comment`                | Any comment                                                                                                   |
| `comment.line`           | A `//` (or PHP's `#`) line comment                                                                            |
| `comment.line.doc`       | A C# `///` XML doc comment line                                                                               |
| `comment.block`          | A `/* ... */` block comment                                                                                   |
| `comment.block.doc`      | A `/** ... */` doc comment (JSDoc/Javadoc/PHPDoc-style)                                                       |
| `string`                 | Any string-like literal                                                                                       |
| `string.singleQuote`     | A `'...'` string/char literal                                                                                 |
| `string.doubleQuote`     | A `"..."` string literal                                                                                      |
| `string.templateLiteral` | A literal text fragment of a JS/TS template string (`` `...` ``), excluding `${...}` holes                    |
| `string.verbatim`        | A C# `@"..."` verbatim string (doubled `""` is an escaped quote; no backslash escapes)                        |
| `string.interpolated`    | A literal text fragment of a C# `$"..."` interpolated string, excluding `{...}` holes                         |
| `string.raw`             | A C++ `R"delim(...)delim"` raw string, a Go `` `...` `` raw string, or a C# 11 `"""..."""` raw string literal |
| `string.textBlock`       | A Java `"""..."""` text block                                                                                 |
| `string.heredoc`         | A PHP `<<<ID ... ID` heredoc (interpolated, like a double-quoted string)                                      |
| `string.nowdoc`          | A PHP `<<<'ID' ... ID` nowdoc (literal, like a single-quoted string)                                          |
| `html`                   | HTML (or other non-PHP) content outside a PHP file's `<?php ... ?>` tags, passed through unchanged            |
| `code`                   | PHP code that isn't a comment or string (identifiers, keywords, punctuation, numbers, tag delimiters)         |

A C# string can carry more than one of these at once - a combined verbatim-and-interpolated `$@"..."`/`@$"..."`
fragment is tagged with both `string.verbatim` and `string.interpolated`, and an interpolated C# 11 raw string
(`$"""..."""`) with both `string.raw` and `string.interpolated`.

## How it works

- `parser.parse(content, filename)` returns a `ParseResult` containing one or more `ParsedText` entries.
- Each `ParsedText.range` is the `[start, end]` offset of that segment in the original `content`, which is how
  cspell maps spelling issues found in the parsed text back to the right place in the source file.
- Which language-specific forms apply (template literals, verbatim/raw strings, heredoc, ...) is chosen once
  per file from `filename`'s extension - falling back to a plain `//`/`/* */`/`'...'`/`"..."` baseline for an
  unrecognized one.
- Every segment is tagged with a dot-separated tag, plus every ancestor of it (`string.heredoc` also carries
  `string`) - `customizePlugin` can filter which segments get spell checked using these tags, at any level of
  specificity (just `string`, or the more specific `string.heredoc`).
- A JS/TS template literal or C# interpolated string is split into one `ParsedText` per literal fragment
  around each `${...}`/`{...}` hole; the hole's own contents are recursively scanned the same way as the rest
  of the file, so a string or comment nested inside an interpolation still gets picked up and tagged normally.
- A PHP file additionally toggles between an HTML pass-through mode and a PHP code-scanning mode at each
  `<?php`/`<?=`/`<?` and `?>` boundary. Text outside those tags is emitted verbatim, tagged `html`; PHP code
  that isn't a comment or string is emitted too, tagged `code` - so, unlike every other language this package
  covers, a PHP file's entire content is still spell checked by default (the same as if no parser applied to
  it) even though most of it isn't a comment or string literal.
- `plugin.parsers` is the list of parsers a cspell plugin module exposes; a plugin can expose more than one.

## Known limitations

This parser is a single hand-written scanner, not a real grammar for each language, which keeps it small and
dependency-free but means a few corners are intentionally simplified:

- **JS/TS regex literals** aren't recognized. A quote character inside a regex literal's body (e.g.
  `/['"]/`) can be mistaken for the start of a string, the same way `@cspell/parser-example` already
  behaves for JavaScript/TypeScript today.
- **C# interpolated raw string literals** (`$"""..."""`) don't split their `{...}` holes out into their own
  code scan the way a plain `$"..."` does - the whole raw string is emitted as one segment, holes included.
  This only affects how much of that (already rare) form gets spell checked, not whether its boundaries are
  found correctly.
- **PHP heredoc/nowdoc** doesn't strip each line's common leading indentation (PHP 7.3+'s "flexible heredoc"
  dedents the body by the closing marker's indentation at print time) - the raw, indented text is what gets
  spell checked.
- **C# raw string literals** don't dedent either, for the same reason.

None of these affect where a literal's boundaries are found - only how finely a rare sub-form's contents are
split up before being spell checked.

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
