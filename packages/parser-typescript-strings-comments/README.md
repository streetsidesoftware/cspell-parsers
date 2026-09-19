# @cspell/parser-typescript-strings-comments

A strings-and-comments parser plugin for cspell, covering JavaScript, JSX, TypeScript, and TSX - these four
share identical comment/string/template-literal syntax, so one small scanner handles all of them.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

Unlike [`@cspell/parser-example`](https://www.npmjs.com/package/@cspell/parser-example) (comments only) or
[`@cspell/parser-typescript`](https://www.npmjs.com/package/@cspell/parser-typescript) (a full TypeScript/TSX
AST parser that also checks identifiers), this parser only ever emits comments and string-like literals -
never identifiers, keywords, or punctuation - using a small hand-written scanner rather than a real grammar.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for every supported file type:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-typescript-strings-comments/recommended"],
}
```

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-typescript-strings-comments/plugin"],
  "languageSettings": [
    {
      "languageId": "typescript",
      "parser": "typescript-strings-comments",
    },
  ],
}
```

## Supported file types

`recommended` selects the parser for these cspell language IDs:

| Language ID       |
| ----------------- |
| `javascript`      |
| `javascriptreact` |
| `typescript`      |
| `typescriptreact` |

### Filtering by tag

By default every comment/string the parser emits gets spell checked. To check only some of them - for
example, only doc comments - use `customizePlugin` instead of the plain `plugin` export. It takes a
`CustomizePluginOptions` object - `tags` and `name` are both optional, and omitting `tags` keeps everything -
and returns a `Plugin` that only spell checks the segments matching those tags.

```js
// cspell.config.mjs — customizePlugin returns a live Plugin object, so it needs a JS/TS config file
// (.mjs/.ts/.cjs), not .json/.jsonc/.yaml, where "plugins" can only be a list of module-specifier strings.
import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true } })], // only check doc comments
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript-strings-comments',
    },
  ],
};
```

`tags` keys are matched hierarchically against the tags below - `string` also matches the more specific
`string.templateLiteral` unless a more specific key overrides it - and may use `*` as a wildcard
(`string.*`, or a bare `*` for "everything not otherwise matched", which defaults to `true`). See the
[Tags](#tags) table below for every tag this parser can emit.

`name` overrides the parser's registered name (`typescript-strings-comments` by default). This matters when
registering more than one customized copy of this parser, since cspell selects a parser by name and two
parsers can't share one.

## Tags

Every segment carries its own tag plus every ancestor implied by it - a doc comment carries
`comment.block.doc` together with `comment.block` and `comment` - so the `tags` filter above can match at
whatever level of specificity it needs.

| Tag                         | Meaning                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `comment`                   | Any comment                                                                                                                 |
| `comment.line`              | A `//` line comment                                                                                                         |
| `comment.block`             | A `/* ... */` block comment                                                                                                 |
| `comment.block.doc`         | A `/** ... */` doc comment (JSDoc-style)                                                                                    |
| `string`                    | Any string-like literal                                                                                                     |
| `string.singleQuote`        | A `'...'` string literal                                                                                                    |
| `string.doubleQuote`        | A `"..."` string literal                                                                                                    |
| `string.singleQuote.module` | A `'...'` string literal that is also a module specifier                                                                    |
| `string.doubleQuote.module` | A `"..."` string literal that is also a module specifier                                                                    |
| `string.templateLiteral`    | A literal text fragment of a template string (`` `...` ``), excluding `${...}` holes                                        |
| `module`                    | Any module specifier string                                                                                                 |
| `module.specifier`          | Any module specifier string (same as `module`, for a more specific filter)                                                  |
| `module.specifier.literal`  | The module specifier string of an `import`/`export ... from` statement, a dynamic `import('...')`, or a `require(...)` call |

## What gets checked

- **Regex literals (`/pattern/flags`) and `RegExp(...)`/`new RegExp(...)` calls are never spell checked.** A
  regex pattern isn't prose, so both forms are skipped entirely, including any quotes inside. A comment
  inside a `RegExp(...)` call's argument list is still recognized normally; only the pattern/flags string
  arguments are skipped.
- **A module specifier string is still spell checked by default, but tagged so it can be filtered out.**
  `import x from './mod.js'`, `import './side-effect.js'`, `export { x } from './mod.js'`, a dynamic
  `import('./mod.js')`, and `require('./mod.js')` all get the `module`/`module.specifier`/
  `module.specifier.literal` tags in addition to their usual string tags (matching `@cspell/parser-typescript`'s
  convention). Use `customizePlugin` to exclude them if a relative path or package name isn't worth checking.
- A string or comment nested inside a template literal's `${...}` interpolation (e.g. a ternary's string
  branches) is still recognized and tagged normally.

## Known limitations

This scanner isn't a full grammar, so in rare cases it can misjudge whether a `/` starts a regex literal or
is division - most commonly for a regex shaped like `/['"]/`, or one appearing right after an unusual keyword
or a `}` - which can affect whether that spot gets spell checked as prose or skipped as code. See
`CONTRIBUTING.md` for the heuristic this is resolved with.

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
