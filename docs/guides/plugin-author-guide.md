# Plugin author guide

This repo exists for one reason: to help cspell users control **what gets spell checked**, with a cspell
configuration that is simple, easy, and obvious, with no surprises. Every plugin and parser here is judged
by that goal. This guide explains the rules cspell imposes, what users do with a plugin, and what that
means for how you write one.

> **Status:** the `IPluginEx`/`IPluginBuilder` API described here is designed but not yet implemented. The
> decisions behind it, and the migration plan, are in
> [`docs/ADRs/plugin-customization/`](../ADRs/plugin-customization/README.md).

## How cspell uses plugins and parsers

These are cspell's rules. Nothing in this repo can change them.

- **Parsers are registered only through plugins**, in the `plugins` setting of `AdvancedCSpellSettings`.
- **A parser is referred to only by its name.**
- **The last parser with a given name wins.** cspell collects parsers in the order they are declared.
  A user can replace or update a parser by adding a newer plugin that has a parser with that name.
- **`languageSettings` connects file types to parsers**, by name. `overrides[].languageSettings` does the
  same for files matched by filename or location.
- **A parser is never told which file type it is parsing.** `parse(content, filename)` receives only the
  content and filename. Two file types can only behave differently if they go to two parsers with
  different names.

## What a plugin offers

Each parser package exports a plugin, and the plugin comes with recommended settings.

- A plugin has **one or more parsers**, each with a **unique name**. Never ship two parsers with the
  same name in one plugin.
- Each parser is designed for **one or more file types**, listed in its `supportedFileTypes`. These only
  generate `languageSettings`. They don't restrict what a user can point at the parser.
- For a file type listed by several parsers, `recommended` picks the **last** one in the plugin's
  `parsers` order.
- The exported plugin is an **immutable `IPluginEx`**. Users can always get back the original plugin and
  its parsers.

`IPluginEx` has read-only helpers only:

| Member                              | Returns                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `parsers`                           | The plugin's parsers, in order                                          |
| `getParser(name)`                   | The named parser (throws on an unknown name)                            |
| `hasParser(name)`                   | Whether a parser with that name exists                                  |
| `parserNamesFor(fileType)`          | Names of the parsers that list `fileType`, in plugin order              |
| `languageSettings()`                | `languageSettings` entries for every parser (last parser wins)          |
| `languageSettingsFor(name, types?)` | Entries mapping `types` (default: the parser's own) to the named parser |
| `customize()`                       | A new `IPluginBuilder`                                                  |

## What users do with a plugin

A user customizes a plugin through the builder that `customize()` returns. Each method changes the
builder and returns it. The builder works directly as a plugin, and `build()` takes an immutable
snapshot.

```js
import { plugin } from '@cspell/parser-typescript/plugin';

const custom = plugin
  .customize()
  .duplicateParser('typescript', 'js-comments')
  .setFileTypes('js-comments', ['javascript', 'javascriptreact'])
  .filterTags('js-comments', { '*': false, comment: true });

export default defineConfig({
  plugins: [custom],
  languageSettings: [...custom.languageSettings(), ...custom.languageSettingsFor('typescript', ['astro'])],
});
```

What users can rely on:

- **Targets are explicit.** A method's first argument is a parser name, a list of names, or `'*'` for
  every parser.
- **Users name every parser.** Nothing generates a name. `duplicateParser` and `addParser(parser, asName?)`
  append to the end, and `renameParser` keeps the parser's position.
- **Mistakes throw when the config loads.** A name that's already taken or doesn't exist is an error,
  and cspell reports it as a configuration error.
- **Tag filters never chain.** `filterTags` replaces a parser's filter, and every filter is compiled
  against the parser's unfiltered output. So a tag you turn off by default can always be turned back on.
- **File types don't delete parsers.** A parser left with no file types stays in the plugin. Only
  `removeParser` removes a parser.

## Writing a parser

- **Create it with `createPluginParserWithFilterTags`.** Give it a unique `name`, its `supportedFileTypes`,
  the unfiltered `parse`, and `tags`.
- **Express defaults only through `tags`.** Each tag's boolean says whether it is checked by default. Set
  noisy tags such as `code` to `false`. There is no filter function: defaults have to be plain data, so a
  builder can recompile them.
- **Emit hierarchical tags.** Use dot-separated names such as `comment.block.doc`, and include every
  ancestor (`comment`, `comment.block`) on the same segment, so users can filter at any level. Treat tag
  names as public API: once a user filters on one, renaming it breaks their config.
- **Never depend on the file type inside `parse`.** If two file types need different behavior, that's two
  parsers with two names, or one parser that a user duplicates and filters.
- **Keep `parse` free of filtering.** The factory applies the default filter. A parser exposes its
  unfiltered output as `_parse` so builders in any package can re-filter it.

## Wiring the package

- `plugin.ts` exports the `IPluginEx`, and `customizePlugin(options?)`, a thin wrapper that returns
  `plugin.customize()` with `options.tags` applied to every parser.
- `recommended.ts` uses the plugin's `languageSettings()`, so it always agrees with the parsers.
- The README documents every tag in a `Tag` / `Meaning` table and shows a short "Filtering by tag"
  example. See `CONTRIBUTING.md`'s "Adding a new parser package" for the full package shape.
