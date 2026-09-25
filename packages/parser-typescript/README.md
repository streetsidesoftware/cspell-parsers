# @cspell/parser-typescript

A [cspell](https://cspell.org) parser plugin that spell checks JavaScript, JSX, TypeScript, and TSX the way
you write it: the names you choose for variables, functions, properties, and types, along with comments,
strings, and JSX text. Names that come from outside your code, such as package names and what you import from
them, aren't checked, so cspell doesn't flag spelling you can't change. You can also choose what gets checked,
for example only comments.

It uses [`@cspell/parser-typescript-tree-sitter-wasm`](https://www.npmjs.com/package/@cspell/parser-typescript-tree-sitter-wasm),
which runs on WebAssembly, so it installs without a native build step.

## Install

```sh
npm install --save-dev @cspell/parser-typescript
```

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects its parsers for every supported file type:

**`cspell.config.jsonc`**

<!--- @@inject: samples/recommended/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-typescript/recommended"],
}
```

<!--- @@inject-end: samples/recommended/cspell.config.jsonc#lang=jsonc --->

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose the language IDs to use it for:

**`cspell.config.jsonc`**

<!--- @@inject: samples/plugin/cspell.config.jsonc#lang=jsonc --->

```jsonc
{
  "import": ["@cspell/parser-typescript"],
  "languageSettings": [
    { "languageId": "typescript", "parser": "typescript" },
    { "languageId": "typescriptreact", "parser": "typescriptreact" },
  ],
}
```

<!--- @@inject-end: samples/plugin/cspell.config.jsonc#lang=jsonc --->

## Supported file types

The plugin has one parser per file type, named after it. Where Recommended is `yes`, `recommended` enables
the named parser for files with that Language ID:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID     | Parser Name     | Recommended |
| --------------- | --------------- | ----------- |
| javascript      | javascript      | yes         |
| javascriptreact | javascriptreact | yes         |
| typescript      | typescript      | yes         |
| typescriptreact | typescriptreact | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

Each parser reads its file type's own syntax, whatever the file is called. A file you map to
`typescriptreact` is read as TSX, even if it's named `.ts`.

## Filtering by tag

By default, identifiers, strings, comments, and JSX text are spell checked, and the rest of the code isn't.
Use `customizePlugin` to change what gets checked. For example, to check only line comments and doc
comments:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/customize/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-typescript/plugin';

// Check only line comments and doc comments.
export default customizePlugin({
  tags: { '*': false, comment: true, 'comment.block': false, 'comment.block.doc': true },
}).defineConfig();
```

<!--- @@inject-end: samples/customize/cspell.config.mts#lang=ts --->

**NOTE:**

> Keys in `tags` are matched hierarchically against the [tags](#tags) below. For example, the key `comment`
> also matches the more specific `comment.block.doc`, unless a more specific key overrides it. A key can also
> use `*` as a wildcard, such as `comment.*`, or a bare `*` for everything not otherwise matched.

Calling `customizePlugin` gives you a customized copy of the plugin. Call `defineConfig()` on it to get a
complete cspell config, or keep adjusting it first.

## Filtering by file type

Every file type has its own parser, so each one can have its own filter. For example, to check only the
comments in JavaScript files, and keep the defaults for the others:

**`cspell.config.ts`** or **`cspell.config.mjs`**

<!--- @@inject: samples/filter-by-file-type/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-typescript/plugin';

// JavaScript files: check only comments.
// Other files: keep the defaults.
export default customizePlugin().filterTags('javascript', { '*': false, comment: true }).defineConfig();
```

<!--- @@inject-end: samples/filter-by-file-type/cspell.config.mts#lang=ts --->

## Tags

Each part of a file gets its most specific tag plus the more general ones above it. For example, a doc
comment is tagged `comment.block.doc`, `comment.block`, and `comment`, so a filter can use whichever level it
needs. JSX text is checked, but has no tag.

<!--- @@inject: docs/tags-table.csv#markdown --->

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

<!--- @@inject-end: docs/tags-table.csv#markdown --->

### The `code` tag

By default, keywords, punctuation, numbers, and everything else tagged `code` aren't spell checked. To check
them too:

```js
customizePlugin({ tags: { code: true } }).defineConfig();
```

## Special cases

- **JSX in a `.js` file is read as JSX.** VS Code gives `.js` files the `javascript` file type even when they
  contain JSX, and the `javascript` parser handles it.
  <!--- Tested by packages/parser-typescript-tree-sitter-wasm/src/parsers.test.ts: "parses JSX in a .js file with the javascript parser" --->

- **Package names aren't spell checked.** The package name in an `import`, `export ... from`, `import(...)`,
  or `require(...)`, such as `'lodash'`, `'@scope/pkg'`, or `'node:fs'`, isn't spelling you wrote. A relative
  path such as `'./utils.js'` is still checked.
  <!--- Tested by packages/parser-typescript-tree-sitter-wasm/src/parsers.test.ts: "imports.ts" and "imports-and-local-variables.mts" --->

- **Names that come from an imported package aren't spell checked.** That includes a named import's original
  name and properties read from an imported value. A name you chose, such as a renamed import's alias or a
  default import's name, is checked.
  <!--- Tested by packages/parser-typescript-tree-sitter-wasm/src/parsers.test.ts: "imports.ts" and "module-bindings.ts" --->

- **A local name that reuses an import's name is checked.** A variable or parameter that shadows an import is
  your own name, so it's checked where it's in scope.
  <!--- Tested by packages/parser-typescript-tree-sitter-wasm/src/parsers.test.ts: "imports-and-local-variables.mts" and "lets a JavaScript parameter shadow an import of the same name" --->

## Customization options

Use `customizePlugin(options)` to control which parts of a file get spell checked, based on the [tags](#tags)
the parsers give each part. The filter applies to every parser in the plugin.

### `CustomizePluginOptions`

```ts
interface CustomizePluginOptions {
  /**
   * Define which tagged segments to keep.
   */
  tags: TagFilterOptions;
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

```ts
const option = { tags: { '*': false, comment: true } };
```

**Turn off `identifier.type`**

```ts
const option = { tags: { 'identifier.type': false } };
```

### `TagFilterOptions`

Use `TagFilterOptions` to set the filter criteria for the text sent to the spell checker.

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

- Uses [`@cspell/parser-typescript-tree-sitter-wasm`](https://www.npmjs.com/package/@cspell/parser-typescript-tree-sitter-wasm),
  which runs on WebAssembly, so it doesn't need a native compiler toolchain to install.

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
