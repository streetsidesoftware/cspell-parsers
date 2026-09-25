# 0015. Packages export an immutable `IPluginEx`; customization happens on an `IPluginBuilder`

Status: Accepted

## Context

[0004](./0004-chained-immutable-methods.md) put the chained customization methods on `IPluginEx` itself,
each returning a new immutable plugin. That has two problems:

- A method that looks like it changes the plugin but actually returns a new one misleads the user. If they
  call `plugin.filterTags(...)` without using the result, the change is silently lost.
- The plugin a package exports must stay recoverable. It should always be possible to get the original
  plugin and its parsers, whatever a config has done with them.

A builder was considered alongside a customizable-plugin type. Two builder behaviors were weighed: methods
that change the builder and return it, or methods that return a new builder each time. With the second,
code that doesn't reassign every call silently loses changes.

## Decision

- Each parser package exports an immutable `IPluginEx`. It has no methods that look like changes, only
  read-only helpers (`languageSettings()`, `languageSettingsFor()`, `parserNamesFor()`) and
  `customize()`.
- `customize()` returns a new `IPluginBuilder`, seeded from that plugin. The customization methods
  (`duplicateParser`, `renameParser`, `removeParser`, `filterTags`, `setFileTypes`, `addFileTypes`,
  `removeFileTypes`) live on the builder. Each one changes the builder and returns it, so calls can be
  chained or written as separate statements.
- A builder is usable directly as a plugin (`plugins: [builder]`), and has the same read-only helpers.
  Most users never call `build()`.
- `build()` returns an immutable `IPluginEx` snapshot of the builder's current state, which later builder
  calls don't affect. This is mainly for plugin authors.

```js
import { plugin } from '@cspell/parser-typescript/plugin';

const custom = plugin
  .customize()
  .duplicateParser('typescript', 'js-comments')
  .setFileTypes('js-comments', ['javascript', 'javascriptreact'])
  .filterTags('js-comments', { '*': false, comment: true });

export default defineConfig({
  plugins: [custom],
  languageSettings: custom.languageSettings(),
});
```

This supersedes 0004. The chained style stays, but the methods are on a mutable builder, not on an
immutable plugin.

## Consequences

- An exported plugin can never be changed by a consumer, so it can always be reused as the original.
- The customization methods decided in [0006](./0006-user-names-new-parsers.md) through
  [0014](./0014-rename-keeps-position.md) are builder methods. Their examples written as
  `plugin.method(...)` read as `plugin.customize().method(...)`.
- A builder already placed in `plugins` still changes if the user keeps calling methods on it. `build()`
  is the way to freeze it.
- The builder name (`IPluginBuilder`) is provisional.
