# 0007. `IParserEx` is read-only data that carries its unfiltered parse and filter

Status: Accepted

## Context

Today's `IParser` has `customize()`, `customizeFilter()`, and `customizeSupportedFileTypes()`, each returning
a changed copy: the misleading pattern [0004](./0004-immutable-plugin-and-builder.md) removes from plugins.
Users only reach parsers through a plugin, so a separate parser builder would double the API for no benefit.

For filters never to chain ([0006](./0006-tag-filtering.md)), a builder needs each parser's unfiltered output,
original tags, and current filter. Private class fields can't carry them across packages: each package
bundles its own copy of `@internal/utils`, and `parser-strings-comments` builds its plugin from other
packages' parsers. A hidden `Symbol.for` key was considered and rejected in favor of plain, visible data.

## Decision

`IParserEx` is read-only data with no customization methods:

- `name`, `supportedFileTypes`, and `tags` (the author's defaults);
- `parse`, the filtered function cspell calls;
- `_parse`, the unfiltered parse, before any tag filter;
- the tag filter options currently compiled into `parse`, absent when it uses the author's defaults.

Inside `IPluginBuilder`, each parser is an instance of a new internal class, replacing `PluginParserImpl`.
Private fields keep the original `_parse` and `tags`, alongside the current name, file types, and filter. It
produces the `IParserEx` that cspell sees, compiling the filter against the originals. A parser from any
package is read into this class through its public data.

`parseDocument` isn't supported. It's a future cspell feature, no parser here implements it, and the builder
doesn't pass it through.

## Consequences

- A parser taken from any plugin can be added to a builder without changing its source, and keeps behaving
  exactly as it did there.
- Re-filtering always starts from the original output, however many times a parser was renamed, duplicated,
  added, or filtered.
- The leading underscore marks `_parse` as plumbing for builders. It's still part of the public type.
- The field name for the filter options (e.g. `filterTags?: TagFilterOptions`) is provisional.
