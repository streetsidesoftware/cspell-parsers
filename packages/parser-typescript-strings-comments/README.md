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
`CustomizePluginOptions` object - `tags: TagFilterOptions` and `name` are both optional, and omitting `tags`
keeps everything - and returns a `Plugin` whose parser filters segments by tag itself, before cspell ever
sees them.

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

## How it works

- `parser.parse(content, filename)` returns a `ParseResult` containing one or more `ParsedText` entries.
- Each `ParsedText.range` is the `[start, end]` offset of that segment in the original `content`, which is how
  cspell maps spelling issues found in the parsed text back to the right place in the source file.
- Every segment is tagged with a dot-separated tag, plus every ancestor of it (`comment.block.doc` also
  carries `comment` and `comment.block`) - `customizePlugin` can filter which segments get spell checked
  using these tags, at any level of specificity (just `comment`, or the more specific `comment.block.doc`).
- A template literal is split into one `ParsedText` per literal fragment around each `${...}` hole; the
  hole's own contents are recursively scanned the same way as the rest of the file, so a string or comment
  nested inside an interpolation (e.g. a ternary's string branches) still gets picked up and tagged normally.
- **Regex literals (`/pattern/flags`) and `RegExp(...)`/`new RegExp(...)` calls are never spell checked.** A
  regex pattern isn't prose - it's rare for its content, or a `RegExp` constructor's string arguments, to be
  something a spell checker should flag - so this parser recognizes both forms and skips them entirely,
  including any quote characters inside, rather than trying to check them like an ordinary string. A comment
  inside a `RegExp(...)` call's argument list is still recognized normally; only the string arguments
  themselves (pattern and, if given, flags) are skipped.
- **A string used as a module specifier is still spell checked by default, but tagged so it can be filtered
  out.** `import x from './mod.js'`, `import './side-effect.js'`, `export { x } from './mod.js'`, a dynamic
  `import('./mod.js')`, and `require('./mod.js')` all get the `module`/`module.specifier`/
  `module.specifier.literal` tags on their specifier string, in addition to its usual string tags - the same
  convention `@cspell/parser-typescript` uses. Unlike regex patterns, module specifiers aren't excluded
  outright, since a relative path (`./mod.js`) or package name (`prettier`) is sometimes still worth
  checking - `customizePlugin` is how you opt out of them, per file type, if you'd rather not.
- `plugin.parsers` is the list of parsers a cspell plugin module exposes; a plugin can expose more than one.

## Known limitations

This parser is a small hand-written scanner, not a real grammar, which keeps it dependency-free but means it
resolves the regex-literal-vs-division ambiguity (`/pattern/` vs. `a / b`) with a lightweight heuristic
rather than full expression tracking: it looks at whatever significant character comes right before the `/`
(an identifier, a keyword, `)`, `]`, `}`, ...) the same way a real JS parser's tokenizer does. This correctly
recognizes a regex literal in the overwhelming majority of real code, including every case that would
previously have been misread as a string (a quote character anywhere in the body, e.g. `/don't/`, `/[\w"']/`,
or even `/['"]/`, which is genuinely ambiguous with a real string starting right after an array literal's
bracket and was never fixable by looking at quote characters alone).

The heuristic can still occasionally miss a real regex - most likely right after a keyword this parser
doesn't know introduces an expression, or right after `}` (deliberately always treated as division-like,
since that closes both a block statement, where a regex often follows, and an object literal, where `/`
would be real division - see `CONTRIBUTING.md` for why getting `}` wrong in the _other_ direction is the
worse failure). When it does miss one, a quote inside that regex falls back to a narrower, per-character
mitigation: a quote directly preceded by an identifier character or another quote is still never mistaken
for a real string's start, since valid JS/TS syntax could never have one begin there either.

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
