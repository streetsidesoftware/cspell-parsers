# @cspell/parser-csharp-strings-comments

A cspell plugin that spell checks only the comments and string literals in C# files, leaving identifiers,
keywords, and the rest of the code alone.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-csharp-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-csharp-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "csharp",
      "parser": "csharp-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for these cspell language IDs:

| Language ID |
| ----------- |
| `csharp`    |

### Filtering by tag

By default every comment/string the parser emits gets spell checked, and `code` (everything else -
identifiers, keywords, punctuation, numbers, preprocessor directives) is excluded. To change which segments
get checked - for example, only XML doc comments, or also checking `code` - use `customizePlugin` instead of
the plain `plugin` export. It takes a `CustomizePluginOptions` object - `tags: TagFilterOptions` and `name`
are both optional, and omitting `tags` keeps the defaults above - and returns a `Plugin` whose parser
filters segments by tag itself, before cspell ever sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-csharp-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.line.doc': true } })], // only check XML doc comments
  languageSettings: [
    {
      languageId: 'csharp',
      parser: 'csharp-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.raw` unless a more specific key overrides it - and may use `*` as a wildcard (`string.*`, or a bare
`*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table below for
every tag this parser can emit.

`name` overrides the parser's registered name (`csharp-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

## Tags

<!--- @@inject: docs/tags-table.md --->

| Tag                   | Meaning                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `comment`             | Any comment                                                                                                   |
| `comment.line`        | A `//` line comment                                                                                           |
| `comment.line.doc`    | A `///` XML doc comment line (not a `////`-or-more separator line)                                            |
| `comment.block`       | A `/* ... */` block comment                                                                                   |
| `comment.block.doc`   | A `/** ... */` doc-style block comment (not a conventional C# form, but handled)                              |
| `string`              | Any string-like literal                                                                                       |
| `string.singleQuote`  | A `'...'` character literal                                                                                   |
| `string.doubleQuote`  | A `"..."` string literal                                                                                      |
| `string.verbatim`     | A `@"..."` verbatim string literal                                                                            |
| `string.interpolated` | A `$"..."` interpolated string literal fragment                                                               |
| `string.raw`          | A C# 11 `"""..."""` raw string literal                                                                        |
| `code`                | C# code that isn't a comment or string (identifiers, keywords, punctuation, numbers, preprocessor directives) |

<!--- @@inject-end: docs/tags-table.md --->

`string.verbatim` and `string.interpolated` are combined on the same segment for a `$@"..."`/`@$"..."`
string; `string.raw` and `string.interpolated` are combined for an interpolated raw string literal.

## Known limitations

An interpolated string's `{...}` holes are treated as ordinary code, so a string or comment nested inside one
(e.g. a ternary's string branches) is recognized and tagged normally, the same as anywhere else in the file;
`{{`/`}}` are literal braces, not holes. This parser is a small hand-written scanner, not a real grammar,
which keeps it dependency-free but comes with two deliberate, documented simplifications for the C# 11 raw
string literal form:

- It does not strip the common leading indentation raw string literals conventionally share with their
  closing delimiter - the emitted text keeps each line's original indentation as written in the source.
- An interpolated raw string literal's `{...}` holes are **not** split out into their own recursive scan the
  way an ordinary interpolated string's holes are - the whole body, including any `{...}` holes, is emitted
  as one segment tagged `string.raw` + `string.interpolated`.

Both only affect formatting/identifier-checking of an already-rare form, not whether the literal's own
boundaries are found correctly, so they're a reasonable scope limit rather than a bug - see
`CONTRIBUTING.md` for more detail.

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
