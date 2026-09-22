# @cspell/parser-java-strings-comments

A cspell plugin that extracts Java comments and string-like literals - including Java 15+ text blocks - so
cspell only spell checks those by default, not identifiers, keywords, or other code (everything else is
still tagged `code`, so it can be opted into with `customizePlugin` if you want it checked too).

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-java-strings-comments/recommended"],
}
```

For more control - for example, to apply it alongside other settings - wire the plugin in yourself and
choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-java-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "java",
      "parser": "java-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for this cspell language ID:

| Language ID |
| ----------- |
| `java`      |

### Filtering by tag

By default every comment/string the parser emits gets spell checked, and `code` (everything else -
identifiers, keywords, punctuation, numbers, annotations) is excluded. To change which segments get checked,
for example to keep only Javadoc comments or to also check `code`, use `customizePlugin` instead of the
plain `plugin` export. It takes a `CustomizePluginOptions` object - `tags: TagFilterOptions` and `name` are
both optional, and omitting `tags` keeps the defaults above - and returns a `Plugin` whose parser filters
segments by tag itself, before cspell ever sees them.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-java-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true } })], // only check Javadoc comments
  languageSettings: [
    {
      languageId: 'java',
      parser: 'java-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.textBlock` unless a more specific key overrides it - and may use `*` as a wildcard (`string.*`, or a
bare `*` for "everything not otherwise matched", which defaults to `true`). See the [Tags](#tags) table below
for every tag this parser can emit.

`name` overrides the parser's registered name (`java-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

## Tags

<!--- @@inject: docs/tags-table.md --->

| Tag                  | Meaning                             |
| -------------------- | ----------------------------------- |
| `comment`            | Any comment                         |
| `comment.line`       | A `//` line comment                 |
| `comment.block`      | A `/* ... */` block comment         |
| `comment.block.doc`  | A `/** ... */` Javadoc comment      |
| `string`             | Any string-like literal             |
| `string.singleQuote` | A `'...'` character literal         |
| `string.doubleQuote` | A `"..."` string literal            |
| `string.textBlock`   | A `"""..."""` text block (Java 15+) |

<!--- @@inject-end: docs/tags-table.md --->

## Known limitations

This parser is a small hand-written scanner, not a real grammar. It doesn't build an AST, so it can't tell
you anything about what a string or comment is being used for - only where it is and how it was delimited.

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
