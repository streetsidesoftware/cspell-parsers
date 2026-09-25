# 0007. Plugins generate `languageSettings` through helper methods

Status: Accepted

## Context

After customizing a plugin, the user still has to connect file types to parsers by name in
`languageSettings`. Writing those entries by hand means repeating names and file types the plugin already
knows. A builder pattern for the whole config was considered and rejected, because it doesn't make
generating `languageSettings` any easier than a plain method does.

## Decision

`IPluginEx` will have two helper methods, each returning entries for `AdvancedCSpellSettings.languageSettings`:

- `languageSettings()` generates entries for all of the plugin's parsers, using the same rule as
  `recommended` ([0002](./0002-parsers-own-file-types.md): for each file type, the last parser that lists
  it).
- `languageSettingsFor(name, fileTypes?)` generates entries mapping `fileTypes` to the parser called
  `name`. If `fileTypes` is omitted, the parser's own file types are used. `fileTypes` may include types
  the parser doesn't list, such as `astro` below; the user is being explicit.

The plugin also gets `addFileTypes` and `removeFileTypes` alongside `setFileTypes`.

```js
const custom = plugin; // ...customizations

export default defineConfig({
  plugins: [custom],
  languageSettings: [...custom.languageSettings(), ...custom.languageSettingsFor('typescript', ['astro'])],
});
```

## Consequences

- The user writes parser names only where they choose to, e.g. to point an extra file type at a parser.
- `languageSettings` is plain data in the user's config, so they can see and reorder it; no hidden
  mapping.
- Still to decide: what `languageSettingsFor` does with an unknown parser name, and the exact signatures
  of `addFileTypes`/`removeFileTypes`.
