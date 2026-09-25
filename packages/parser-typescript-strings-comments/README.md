# @cspell/parser-typescript-strings-comments

A cspell plugin for spell checking only the comments and string-like literals in JavaScript, JSX,
TypeScript, and TSX files, leaving identifiers, keywords, and the rest of the code alone. If you also want
identifiers checked (so a misspelled variable or function name gets flagged too), use
[`@cspell/parser-typescript`](https://www.npmjs.com/package/@cspell/parser-typescript) instead.

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

The plugin provides these parsers. Where Recommended is `yes`, `recommended` enables the named parser for files with that Language ID:

<!--- @@inject: docs/language-id-n-parser-name.csv --->

| Language ID     | Parser Name                 | Recommended |
| --------------- | --------------------------- | ----------- |
| javascript      | typescript-strings-comments | yes         |
| javascriptreact | typescript-strings-comments | yes         |
| typescript      | typescript-strings-comments | yes         |
| typescriptreact | typescript-strings-comments | yes         |

<!--- @@inject-end: docs/language-id-n-parser-name.csv --->

### Filtering by tag and file type

By default every comment/string the parser emits gets spell checked. Use `customizePlugin` to change what is sent on to the spell checker.
See also: [Customization options](#customization-options)

**`cspell.config.ts`** or **`cspell.config.mjs`**

For example, to check only doc comments in TypeScript files:

<!--- @@inject: samples/customize/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true } })],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript-strings-comments',
    },
  ],
};
```

<!--- @@inject-end: samples/customize/cspell.config.mts#lang=ts --->

**NOTE:**

> Keys in `tags` are used to filter the text sent to the spell checker. They are matched hierarchically against the [tags](#tags) below.

Both `customizePlugin` and `plugin.customize()` give you a customized copy of the plugin. You can add it to
`plugins` straight away, or keep adjusting it first. For example, this config checks TypeScript files as
usual, but checks only the comments in JavaScript files. It does that by adding a second parser, named
`js-comments-only`, for JavaScript files:

<!--- @@inject: samples/customize-by-file-type/cspell.config.mts#lang=ts --->

```ts
import { plugin } from '@cspell/parser-typescript-strings-comments/plugin';

// JavaScript files: check only comments.
// TypeScript files: keep the defaults.
const customPlugin = plugin
  .customize()
  .duplicateParser('typescript-strings-comments', 'js-comments-only')
  .setFileTypes('js-comments-only', ['javascript', 'javascriptreact'])
  .filterTags('js-comments-only', { '*': false, comment: true });

export default {
  plugins: [customPlugin],
  languageSettings: customPlugin.languageSettings(),
};
```

<!--- @@inject-end: samples/customize-by-file-type/cspell.config.mts#lang=ts --->

**NOTE:**

> The `tags` key `comment` also matches the more specific `comment.line`, `comment.block`, and
> `comment.block.doc`, unless a more specific key overrides it. See: [`CustomizePluginOptions`](#customizepluginoptions)
> and [`TagFilterOptions`](#tagfilteroptions) below.

**What is `js-comments-only`?**

> It's a copy of the plugin's `typescript-strings-comments` parser, set up to check only comments. In a cspell
> config, `languageSettings` picks a parser for each file type by its name. Because the copy has its own name,
> JavaScript files can use it while TypeScript files keep the original. Calling
> `customPlugin.languageSettings()` writes those entries for you.
>
> Every parser in a plugin needs its own name, so `duplicateParser` and `renameParser` always ask you for the
> new one. Using a name that's already taken is an error, reported when cspell loads your config.

## Tags

Every segment carries its own tag plus every ancestor implied by it - a doc comment carries
`comment.block.doc` together with `comment.block` and `comment` - so the `tags` filter above can match at
whatever level of specificity it needs.

<!--- @@inject: docs/tags-table.csv#markdown --->

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
| `code`                      | Everything else (off by default)                                                                                            |

<!--- @@inject-end: docs/tags-table.csv#markdown --->

### The `code` tag

By default, text tagged `code` is not spell checked. To check it too, use `customizePlugin`:

<!--- @@inject: samples/check-code/cspell.config.mts#lang=ts --->

```ts
import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';

// Also check code, such as identifiers and keywords.
const customPlugin = customizePlugin({ tags: { code: true } });

export default {
  plugins: [customPlugin],
  languageSettings: customPlugin.languageSettings(),
};
```

<!--- @@inject-end: samples/check-code/cspell.config.mts#lang=ts --->

## What gets checked

- **Regex literals (`/pattern/flags`) and `RegExp(...)`/`new RegExp(...)` calls are tagged `code`, so they're
  not spell checked by default.** A regex pattern isn't prose, so both forms are skipped entirely, including
  any quotes inside - the same as any other unrecognized code (see [The `code` tag](#the-code-tag)). A
  comment inside a `RegExp(...)` call's argument list is still recognized normally; only the pattern/flags
  string arguments are tagged `code`.
- **A module specifier string is still spell checked by default, but tagged so it can be filtered out.**
  `import x from './mod.js'`, `import './side-effect.js'`, `export { x } from './mod.js'`, a dynamic
  `import('./mod.js')`, and `require('./mod.js')` all get the `module`/`module.specifier`/
  `module.specifier.literal` tags in addition to their usual string tags. Use `customizePlugin` to exclude them if a relative path or package name isn't worth checking.
- A string or comment nested inside a template literal's `${...}` interpolation (e.g. a ternary's string
  branches) is still recognized and tagged normally.

## Customization options

Use `customizePlugin(options)` to control which parts of a file get spell checked, based on the [tags](#tags)
the parser gives each part. The filter applies to every parser in the plugin.

You can keep adjusting the plugin it returns. For example, to give the parser a different name:

```js
customizePlugin({ tags: { '*': false, comment: true } }).renameParser('typescript-strings-comments', 'my-parser');
```

### `CustomizePluginOptions`

```ts
interface CustomizePluginOptions {
  /**
   * Define which tagged segments to keep.
   */
  tags: TagFilterOptions;
}
```

Earlier versions of `customizePlugin` took a `name` option to rename the parser. It still works, but it's
deprecated and will be removed in a future release. Use `renameParser` instead, as shown above.

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

**Turn off `module.specifier`**

```ts
const option = { tags: { 'module.specifier': false } };
```

### `TagFilterOptions`

Use `TagFilterOptions` to set the filter criteria for the text sent to the spell checker.

The values are inherited hierarchically:

- `comment: false` also implies `comment.line` is `false` unless overridden by `'comment.line': true`

Wildcards:

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
