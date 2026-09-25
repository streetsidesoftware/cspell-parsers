# 0009. `defineConfig` merges a plugin into the user's settings

Status: Accepted

## Context

Almost every example repeats the same two lines: the plugin goes into `plugins`, and its
`languageSettings()` goes into `languageSettings`. A user can register the plugin and forget the
`languageSettings`, or the other way round.

```ts
const customPlugin = customizePlugin({ tags: { code: true } });

export default {
  plugins: [customPlugin],
  languageSettings: customPlugin.languageSettings(),
};
```

`@cspell/cspell-types` already exports a standalone `defineConfig(settings)` that only adds typing. A method
with the same name on the plugin reads naturally next to it, and does more.

Typing `settings` as cspell's full `AdvancedCSpellSettings` would inline its declarations into every
package's `plugin.d.ts`, which the repo avoids.

## Decision

`IPluginEx` and `IPluginBuilder` both get `defineConfig(settings?)`. It returns the user's settings with the
plugin merged in:

```ts
export default customizePlugin({ tags: { code: true } }).defineConfig({
  words: ['myword'],
});
```

- **The plugin's entries go first, so the user's win.** The result has
  `plugins: [plugin, ...settings.plugins]` and
  `languageSettings: [...plugin.languageSettings(), ...settings.languageSettings]`. A user entry for the same
  file type overrides the plugin's, and a user plugin with a parser of the same name replaces it.
- **Every parser is covered.** `defineConfig` uses `languageSettings()`, and takes no target. A user narrows
  it with their own `languageSettings` entries, or with `removeParser` first.
- **A customized copy is registered as a snapshot.** On an `IPluginBuilder`, `plugins` gets `build()`, so
  later changes to the copy can't make `plugins` and `languageSettings` disagree.
- **The parameter is generic, with a minimal constraint.** `settings` is typed
  `T extends { plugins?; languageSettings? }`, and the result keeps the user's type. Full checking of other
  keys comes from wrapping the call in cspell's own `defineConfig`, or from `satisfies`.
- **Other keys are copied as they are.** The settings object isn't changed.

## Consequences

- Examples shrink to one call, and `plugins` and `languageSettings` can't get out of step.
- `recommended.ts` can be `plugin.defineConfig()`.
- The `.d.ts` stays small, but a misspelled key such as `wrods` isn't caught unless the user adds cspell's
  `defineConfig` or `satisfies`.
- It lands in its own PR: `@internal/utils`, plus the already-migrated `parser-typescript-strings-comments`.
  Open and later migrations adopt it in their samples, READMEs, and `recommended.ts`.
- `defineConfig` merges only `plugins` and `languageSettings` at the top level. It doesn't touch
  `overrides[].languageSettings`.

<!-- cspell:ignore myword wrods -->
