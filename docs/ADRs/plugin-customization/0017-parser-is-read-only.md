# 0017. `IParser` is read-only data with no customization methods

Status: Accepted

## Context

Today's `IParser` has `customize()`, `customizeFilter()`, and `customizeSupportedFileTypes()`, each returning
a changed copy. That's the pattern [0015](./0015-immutable-plugin-and-builder.md) removed from the plugin:
a method that looks like a change but returns a new object. Users only reach parsers through a plugin, and
all customization goes through `IPluginBuilder`.

The options were: make `IParser` read-only data, give it its own builder, or leave it as it is.

## Decision

`IParser` is read-only data: `name`, `parse` (and `parseDocument` where supported), `supportedFileTypes`, and
`tags`. It has no customization methods. The plugin builder keeps each parser's filter and file types and
creates the resulting parsers itself. Plugin authors create parsers with a factory function.

## Consequences

- A parser taken from any plugin, including the original, can be put into a builder without any risk of
  changing the plugin it came from.
- `customizeParser`, `customizeParserPlugin`, and the `customize*` methods on today's `IParser` go away once
  every package has migrated ([0001](./0001-compatibility-policy.md)).
- There is one customization API, the plugin builder, not one per level.
