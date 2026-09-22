# @cspell/parser-typescript-tree-sitter-wasm

A [cspell](https://cspell.org) parser plugin for TypeScript (`.ts`, `.mts`, `.cts`) and TSX/JSX (`.tsx`,
`.jsx`) source files. It understands the language well enough to skip things that were never meant to be
read as words — keywords, punctuation, numeric literals — and to leave import specifiers, external package
names, and property access on imported values alone, so it produces fewer false positives than plain
text-based checking.

## Install

```sh
npm install --save-dev @cspell/parser-typescript-tree-sitter-wasm
```

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for TypeScript, JavaScript, TSX, and JSX files:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-typescript-tree-sitter-wasm/recommended"],
}
```

For more control — for example, to apply it to only some file types, or alongside other settings — wire the
plugin in yourself and choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-typescript-tree-sitter-wasm/plugin"],
  "languageSettings": [
    {
      "languageId": "typescript,typescriptreact",
      "parser": "typescript",
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

### Filtering by tag and file type

By default every segment the parser emits gets spell checked, except `code`. Use `customizePlugin` to change what is sent on to the spell checker.
See also: [Customization options](#customization-options)

**`cspell.config.ts`** or **`cspell.config.mjs`**

```js
import { customizePlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';

const customPlugin = customizePlugin({
  // set the parser name to be used in languageSettings
  name: 'typescript-comments-only',
  tags: { '*': false, comment: true }, // only check comments
});

export default {
  plugins: [customPlugin],
  languageSettings: [
    {
      // select the customized parser by name, for typescript and tsx files only
      languageId: 'typescript,typescriptreact',
      parser: 'typescript-comments-only',
    },
  ],
};
```

**NOTE:**

> `name` overrides the parser's registered name (`typescript` by default). This matters when registering more
> than one customized copy of this parser, since cspell selects a parser by name and two parsers can't share
> one.

**NOTE:**

> `tags` keys are matched hierarchically against the [tags](#tags) below.
>
> The key `comment` also matches the more specific
> `comment.block.doc` unless a more specific key overrides it. See: [`CustomizePluginOptions`](#customizepluginoptions) and [`TagFilterOptions`](#tagfilteroptions) below.

## What it does differently

- Checks identifiers, string/template contents, comments, and JSX text by default; keywords, punctuation,
  and numbers are tagged `code` and off by default - see [The `code` tag](#the-code-tag).
- Doesn't flag a package name in an `import`/`export ... from` (`'lodash'`, `'@scope/pkg'`, `'node:fs'`) —
  that's not spelling you authored.
- Doesn't flag a named import's original export name, or properties accessed on an imported value —
  those come from the package being imported, not from your code. A renamed import's local alias, since you
  chose that name, _is_ checked.
- Still checks a local variable or parameter that happens to reuse an import's name, for the scope where it
  shadows that import.
- Tags each checked segment with a dot-separated tag, plus every ancestor of it (`comment.block.doc` also
  carries `comment` and `comment.block`) - `customizePlugin` can filter which segments get spell checked
  using these tags, at any level of specificity. JSX text is checked but carries no tag.

## Tags

<!--- @@inject: docs/tags-table.md --->

| Tag                            | Meaning                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `string`                       | A string literal (fallback for a quote style that's neither `'` nor `"`)                                 |
| `string.singleQuote`           | A `'...'` string literal                                                                                 |
| `string.doubleQuote`           | A `"..."` string literal                                                                                 |
| `string.module`                | A module specifier string literal (fallback for a quote style that's neither `'` nor `"`)                |
| `string.singleQuote.module`    | A `'...'` string literal that is also a module specifier                                                 |
| `string.doubleQuote.module`    | A `"..."` string literal that is also a module specifier                                                 |
| `string.templateLiteral`       | A literal text fragment of a template string (`` `...` ``), excluding `${...}` substitutions             |
| `module`                       | Any module specifier string                                                                              |
| `module.specifier`             | Any module specifier string (same as `module`, for a more specific filter)                               |
| `module.specifier.literal`     | The module specifier string of an `import`/`export ... from` statement or a dynamic `import('...')` call |
| `comment`                      | Any comment                                                                                              |
| `comment.line`                 | A `//` line comment                                                                                      |
| `comment.block`                | A `/* ... */` block comment                                                                              |
| `comment.block.doc`            | A `/** ... */` doc comment                                                                               |
| `identifier`                   | Any identifier                                                                                           |
| `identifier.variable`          | A variable name                                                                                          |
| `identifier.property`          | An object or class property name                                                                         |
| `identifier.privateProperty`   | A `#private` class property name                                                                         |
| `identifier.type`              | A type name                                                                                              |
| `identifier.shorthandProperty` | A shorthand object property name (the `foo` in `{ foo }`)                                                |
| `identifier.label`             | A statement label                                                                                        |
| `identifier.importBinding`     | A renamed import alias, default import name, or namespace import name                                    |
| `identifier.exportBinding`     | A renamed export alias (`export { x as y }`)                                                             |
| `code`                         | Everything else (off by default)                                                                         |

<!--- @@inject-end: docs/tags-table.md --->

### The `code` tag

By default, text tagged `code` is not spell checked. To check it too, use `customizePlugin`:

**`cspell.config.ts`** or **`cspell.config.mjs`**

```js
import { customizePlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';

export default {
  plugins: [customizePlugin({ tags: { code: true } })],
  languageSettings: [
    {
      languageId: 'typescript,typescriptreact',
      parser: 'typescript',
    },
  ],
};
```

## Customization options

The customization options have two purposes:

- Change the name of the registered parser (not the plugin's own name)
- Set up a `tags` filter to specify what is passed to the spell checker based upon
  the attributed tags.

### `CustomizePluginOptions`

```ts
interface CustomizePluginOptions {
  /**
   * Set the name of the parser. Does not change the plugin's own name.
   */
  name?: string;
  /**
   * Define which tagged segments to keep. Omit to keep the parser's own defaults (`code` excluded).
   */
  tags?: TagFilterOptions;
}
```

### Examples

**Everything including `code`**

```ts
const option = { tags: { '*': true } };
```

**Everything except `code`**

```ts
const option = { tags: { '*': true, code: false } };
```

**Only comments**

Change the parser `name` to `only-comments` and allow only comments.

```ts
const option = { name: 'only-comments', tags: { '*': false, comment: true } };
```

**Turn off `identifier.type`**

```ts
const option = { tags: { 'identifier.type': false } };
```

### `TagFilterOptions`

`TagFilterOptions` are used to set the filter criteria for the text sent to the spell checker.

The values are inherited hierarchically

- `comment: false` also implies `comment.line` is `false` unless overwritten by `'comment.line': true`

Wildcards

- `*` wildcards are weak matches. A more specific match will win.

```ts
/**
 * A tag name, or a `*`-wildcard pattern matching one.
 */
type TagPattern = string;

interface TagFilterOptions {
  /**
   * The default filter setting for any tag not otherwise matched.
   */
  '*'?: boolean | undefined;

  /**
   * Filter setting for the specific tag or wildcard pattern.
   *
   * If not specified, the default (`'*'`) will be used.
   */
  [tag: TagPattern]: boolean | undefined;
}
```

## Notes

- Uses WebAssembly (via `@vscode/tree-sitter-wasm`), so it does not require a native compiler toolchain to install.

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
