# 0021. `customizePlugin` stays as a thin wrapper that returns a builder

Status: Accepted

## Context

Every package exports `customizePlugin`, and every README's "Filtering by tag" section shows it. The
per-language packages take `customizePlugin(options)`, with `options` being `{ name?, tags? }`. With
[0015](./0015-immutable-plugin-and-builder.md), the same thing can be written as
`plugin.customize().filterTags('*', tags)`. The options were to remove `customizePlugin`, keep it as a
wrapper, or deprecate it and remove it when `IPluginEx` is folded back into `IPlugin`.

`name` doesn't fit the new model. A plugin can have several parsers, which can't all take one name
([0006](./0006-user-names-new-parsers.md), [0009](./0009-name-collision-throws.md)).

## Decision

Each package keeps `customizePlugin` as a thin wrapper over its plugin's builder, and it returns the
`IPluginBuilder`:

```ts
interface CustomizePluginOptions {
  name?: undefined;
  tags: TagFilterOptions;
}

export function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder;
/** @deprecated */
export function customizePlugin(options: CustomizeParserOptions): IPluginBuilder;
```

- `customizePlugin()` is the same as `plugin.customize()`.
- `customizePlugin({ tags })` is the same as `plugin.customize().filterTags('*', tags)`.
- Passing `name` selects the deprecated overload (the old `CustomizeParserOptions`, with `name?: string`),
  so editors flag it as deprecated.

## Consequences

- Existing `customizePlugin({ tags })` configs keep working, and the return value can now be customized
  further in the same chain.
- `name` is on its way out. Renaming goes through `renameParser`.
- The return type changes from `CSpellPlugin` to `IPluginBuilder`, which is still usable as a plugin.
- Still to decide: what the deprecated overload does with `name` on a plugin with several parsers, and how
  the `parser-strings-comments` bundle's `customizePlugin(fileType, options)` fits.
