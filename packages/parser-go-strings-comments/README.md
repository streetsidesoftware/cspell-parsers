# @cspell/parser-go-strings-comments

A cspell plugin that extracts Go comments and string-like literals - including rune, interpreted, and raw
string literals - so cspell only spell checks those by default, not identifiers, keywords, or other code
(everything else is still tagged `code`, so it can be opted into with `customizePlugin` if you want it
checked too).

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-go-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-go-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "go",
      "parser": "go-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for these cspell language IDs:

| Language ID |
| ----------- |
| `go`        |

### Filtering by tag

By default every comment/string the parser emits gets spell checked, and `code` (everything else -
identifiers, keywords, punctuation, numbers) is excluded. To change which segments get checked - for
example, only string literals, or also checking `code` - use `customizePlugin` instead of the plain `plugin`
export. It takes a `CustomizePluginOptions` object - `tags: TagFilterOptions` and `name` are both optional,
and omitting `tags` keeps the defaults above - and returns a `Plugin` whose parser filters segments by tag
itself, before cspell ever
sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-go-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, string: true } })], // only check string/rune literals
  languageSettings: [
    {
      languageId: 'go',
      parser: 'go-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.singleQuote` unless a more specific key overrides it - and may use `*` as a wildcard (`string.*`, or
a bare `*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table
below for every tag this parser can emit.

`name` overrides the parser's registered name (`go-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

## Tags

<!--- @@inject: docs/tags-table.md --->

| Tag                  | Meaning                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `comment`            | Any comment                                                                                   |
| `comment.line`       | A `//` line comment                                                                           |
| `comment.block`      | A `/* ... */` block comment                                                                   |
| `comment.block.doc`  | A `/** ... */` doc comment (rare in idiomatic Go, which favors plain `//` comments for godoc) |
| `string`             | Any string-like literal                                                                       |
| `string.singleQuote` | A `'...'` rune literal                                                                        |
| `string.doubleQuote` | A `"..."` interpreted string literal                                                          |
| `string.raw`         | A `` `...` `` raw string literal                                                              |

<!--- @@inject-end: docs/tags-table.md --->

## Known limitations

This parser is a small hand-written scanner, not a real grammar. Go's syntax has no regex-literal-vs-division
ambiguity, no string interpolation, and no escape sequences inside a raw string, so - unlike this repo's
JS/TS-family parser - there's nothing here that's only heuristically resolved: comments and every string form
are recognized unambiguously from their delimiters alone.

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
