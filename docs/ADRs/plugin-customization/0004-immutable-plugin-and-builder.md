# 0004. Packages export an immutable `IPluginEx`; users customize an `IPluginBuilder`

Status: Accepted

## Context

A user customizes by combining several operations, so the API should make their order visible. Three shapes
were weighed:

- one options object describing the end state, which needs merge rules and hides order;
- chained methods on the plugin that each return a new immutable plugin, where a call whose result is
  ignored is silently lost;
- an immutable plugin plus a builder.

The plugin a package exports must also stay recoverable, whatever a config does with it. A builder whose
methods return a new builder each time would silently lose calls that aren't reassigned.

## Decision

Each package exports an immutable **`IPluginEx`**. Nothing on it looks like a change. It has:

| Member                                  | Returns                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `parsers`                               | The parsers, in order                                                               |
| `getParser(name)`                       | The named parser as an `IParserEx`; an unknown name throws                          |
| `hasParser(name)`                       | Whether a parser with that name exists                                              |
| `parserNames()`                         | The parser names, in order, usable as a target                                      |
| `parserNamesFor(fileType)`              | Names of the parsers that list `fileType`, in plugin order                          |
| `languageSettings()`                    | Same as `languageSettingsFor('*')`                                                  |
| `languageSettingsFor(target)`           | Entries for the targeted parsers; each file type goes to the last one that lists it |
| `languageSettingsFor(name, fileTypes?)` | Entries mapping `fileTypes` (default: its own) to the named parser                  |
| `languageSettingsForFileType(fileType)` | Entries for only the given file types, each to the last parser that lists it        |
| `customize(name?)`                      | A new `IPluginBuilder` seeded from this plugin, optionally with a new plugin name   |

The `languageSettingsFor(target)` form takes the same target as the builder methods
([0005](./0005-builder-operations.md)) and emits entries in parser order, with no file type mapped twice.
Explicit file types go with a single name only, and may include types the parser doesn't list, e.g. `astro`,
since the user is being explicit. The `languageSettingsForFileType` method takes a file type, a list, or
`'*'`, and never maps a file type it wasn't asked for.

Input the plugin doesn't know throws: an unknown parser name, or a file type no parser lists. Valid input
that maps to nothing (an empty target, a parser with no file types) returns `[]`, so callers never need to
check before spreading the result into `languageSettings`.

**`IPluginBuilder`** has the same read-only members, plus the customization methods
([0005](./0005-builder-operations.md), [0006](./0006-tag-filtering.md)). Each method changes the builder and
returns it, so calls chain or stand as separate statements. A builder works directly as a plugin. Calling
`build()` returns an immutable `IPluginEx` snapshot that later calls don't affect, and `customize()` forks the
builder, e.g. for a renamed, filtered copy used under `overrides` for legacy files. The plugin's own name is
set with `customize(name)` or `setName(name)`.

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

## Consequences

- An exported plugin can never be changed by a consumer, so it can always be reused as the original.
- The order of the chain is the order of operations, so `parsers` order, and with it `recommended`, can be
  read from the code.
- A builder already in `plugins` still changes if the user keeps calling methods on it. `build()` freezes it.
- Customization needs a JS/TS cspell config, as `customizePlugin` does today.
- The name `IPluginBuilder` is provisional.
