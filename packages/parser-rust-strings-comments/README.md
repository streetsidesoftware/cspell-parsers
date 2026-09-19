# @cspell/parser-rust-strings-comments

A strings-and-comments parser plugin for cspell, covering Rust.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

Unlike [`@cspell/parser-example`](https://www.npmjs.com/package/@cspell/parser-example) (comments only), this
parser only ever emits comments and string-like literals - never identifiers, keywords, punctuation, char
literals, or lifetimes - using a small hand-written scanner rather than a real grammar. It understands
Rust's string and comment forms: `"..."` strings, `b"..."` byte strings, `c"..."` C strings, raw strings
(`r"..."`, `r#"..."#`, ...) including byte raw (`br"..."`) and C raw (`cr"..."`) forms, line comments (`//`,
`///`, `//!`), and block comments (`/* */`, `/** */`, `/*! */`) - including Rust's nested block comments.
Char literals (`'...'`, `b'...'`) are never spell checked.

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

| Tag                 | Meaning                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `comment`           | Any comment                                                                   |
| `comment.line`      | A `//` line comment                                                           |
| `comment.line.doc`  | A `///` outer doc comment or `//!` inner doc comment line                     |
| `comment.block`     | A `/* ... */` block comment (including a nested one)                          |
| `comment.block.doc` | A `/** ... */` outer doc block or `/*! ... */` inner doc block                |
| `string`            | Any string-like literal, including a plain `"..."` string                     |
| `string.byte`       | A `b"..."` byte string literal (also carried by `string.byte.raw`)            |
| `string.raw`        | A raw string literal (`r"..."`, `r#"..."#`, ...) - not a byte or C raw string |
| `string.byte.raw`   | A byte raw string literal (`br"..."`, `br#"..."#`, ...)                       |
| `string.c`          | A `c"..."` C string literal (also carried by `string.c.raw`)                  |
| `string.c.raw`      | A C raw string literal (`cr"..."`, `cr#"..."#`, ...)                          |

Since Rust only ever uses `"` for strings, string tags describe a literal's _kind_ (byte/raw/C) rather than
quote style.

## Known limitations

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but comes
with one deliberate, documented scope limit:

- **Char literals and lifetimes get no general recognition at all - a bare `'` is otherwise always just
  ordinary code.** Since char literals are never spell checked, there's nothing to gain from parsing their
  shape. The one exception: a char literal containing a `"` (`'"'` or `'\"'`) is specifically detected and
  skipped as a unit, since otherwise that embedded `"` would be misread as the start of a real string,
  swallowing real code (potentially including a genuine string) up to the next `"` in the file. See
  `CONTRIBUTING.md` for the full rationale.

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
