# @cspell/parser-python-strings-comments

A strings-and-comments parser plugin for cspell, covering Python.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

Like [`@cspell/parser-typescript-strings-comments`](https://www.npmjs.com/package/@cspell/parser-typescript-strings-comments),
this parser only ever emits comments and string literals - never identifiers, keywords, or punctuation - using
a small hand-written scanner rather than a real grammar.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-python-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-python-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "python",
      "parser": "python-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for these cspell language IDs:

| Language ID |
| ----------- |
| `python`    |

### Filtering by tag

By default every comment/string the parser emits gets spell checked. To check only some of them - for
example, to skip f-strings, whose interpolation holes can pull in code-shaped text - use `customizePlugin`
instead of the plain `plugin` export. It takes a `CustomizePluginOptions` object - `tags: TagFilterOptions`
and `name` are both optional, and omitting `tags` keeps everything - and returns a `Plugin` whose parser
filters segments by tag itself, before cspell ever sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-python-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': true, 'string.interpolated': false } })], // skip f-strings
  languageSettings: [
    {
      languageId: 'python',
      parser: 'python-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.singleQuote` unless a more specific key overrides it - and may use `*` as a wildcard (`string.*`, or
a bare `*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table
below for every tag this parser can emit.

`name` overrides the parser's registered name (`python-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

An f-string's `{...}` interpolation holes are scanned like the rest of the file, so a string or comment
nested inside one keeps its own normal tag rather than `string.interpolated` - filtering out
`string.interpolated` only skips the surrounding literal text, not anything nested inside a hole. A doubled
`{{`/`}}` is treated as a literal brace, not a hole.

## Tags

<!--- @@inject: docs/tags-table.md --->

| Tag                   | Meaning                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `comment`             | Any comment                                                                        |
| `comment.line`        | A `#` line comment                                                                 |
| `string`              | Any string-like literal                                                            |
| `string.singleQuote`  | A `'...'` string literal                                                           |
| `string.doubleQuote`  | A `"..."` string literal                                                           |
| `string.tripleQuote`  | A `'''...'''` or `"""..."""` string literal                                        |
| `string.raw`          | Any `r`-prefixed string (`r`, `rb`/`br`, `rf`/`fr`) - composes with the tags above |
| `string.interpolated` | Any `f`-prefixed string (an f-string) - composes with the tags above               |

<!--- @@inject-end: docs/tags-table.md --->

## Known limitations

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but means it
can't reliably tell what role a given piece of syntax plays - only what it looks like character-by-character.
Two consequences worth knowing about:

- **Docstrings aren't detected as a distinct category.** A "docstring" is really just a triple-quoted string
  that happens to be the first statement in a module, class, or function body - recognizing that position
  requires real parsing context (knowing you're at the start of a body, not merely seeing three quote
  characters) that this scanner deliberately doesn't have. Every triple-quoted string gets the same
  `string.tripleQuote` tag regardless of where it appears, so `customizePlugin` can't single out docstrings
  specifically - only triple-quoted strings in general.
- **A string prefix is only recognized directly against its opening quote, with a word-boundary check before
  it** (see `CONTRIBUTING.md`), so a prefix always adjacent to its quote is detected correctly; there's no
  attempt to resolve any ambiguity beyond that single check, since Python's grammar doesn't allow anything
  (not even whitespace) between a prefix and its quote.

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
