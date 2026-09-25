# 0008. `customizePlugin` stays as a thin wrapper that returns a builder

Status: Accepted

## Context

Every package exports `customizePlugin`, and every README's "Filtering by tag" section shows it. The
per-language packages take `customizePlugin({ name?, tags? })`. The `parser-strings-comments` bundle takes
`customizePlugin(fileType, options)`, keeping only the parsers for `fileType`, and also has
`getParser(fileType?)`/`getParserName(fileType?)`, which look parsers up by file type.

The options were to remove `customizePlugin`, keep it as a wrapper, or deprecate it until the fold. The `name`
option doesn't fit a plugin with several parsers, since they can't share one name
([0005](./0005-builder-operations.md)).

## Decision

Each package keeps `customizePlugin` as a thin wrapper over its plugin's builder:

```ts
interface CustomizePluginOptions {
  name?: undefined;
  tags: TagFilterOptions;
}

export function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder;
/** @deprecated */
export function customizePlugin(options: CustomizeParserOptions): IPluginBuilder;
```

- `customizePlugin()` is `plugin.customize()`, and `customizePlugin({ tags })` is
  `plugin.customize().filterTags('*', tags)`.
- Passing `name` selects the deprecated overload. With exactly one parser, it renames that parser, then
  applies `tags`. With several, it throws and points to `renameParser`.
- The bundle has the same signature. Its old `(fileType, options)` form is a further `@deprecated` overload
  that reproduces today's result: it removes the parsers that don't list `fileType`, narrows the rest to
  `fileType`, and applies `tags`. Passing `'*'` keeps every parser and ignores `name`.
- Each package's `createParser(options)` (the `./parser` subpath) stays as a `@deprecated` wrapper that
  returns an `IParserEx`, built through the plugin's builder. It points to `plugin.customize()` and is
  removed at the fold.
- The bundle's file-type `getParser` and `getParserName` are replaced by `getParser(name)`
  ([0004](./0004-immutable-plugin-and-builder.md)). Both take one string, so an overload can't tell a file
  type from a name. The file-type lookup is `parserNamesFor(fileType)`.

## Consequences

- Existing `customizePlugin({ tags })` configs keep working, and the result can be customized further.
- Existing single-parser renames keep working, with a deprecation strikethrough in the editor.
- The return type changes from `CSpellPlugin` to `IPluginBuilder`, which is still usable as a plugin.
- Calls to the bundle's `getParser` with a file type now throw. The bundle's own
  `samples/plugin/cspell.config.mts` uses `plugin.getParser('php')?.name` (the parser is named
  `php-strings-comments`) and moves to `languageSettingsFor` or `parserNamesFor` in its migration step.
