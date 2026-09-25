# 0018. The builder holds each parser in a class that privately keeps its originals

Status: Accepted

## Context

For a filter never to chain ([0012](./0012-filter-tags-replaces.md)), the builder has to compile each
filter against the parser's original output and original tags, not against a parse that has already been
filtered. A parser from a plugin, being read-only data ([0017](./0017-parser-is-read-only.md)), exposes the
plugin author's original tags. The builder needs to keep those originals while it applies the user's
changes.

`PluginParserImpl` in `@internal/utils` already keeps its original `parse` and tags in private fields and
builds the filtered `parse` from them. It doesn't match the builder's needs, though: it has customization
methods, and it isn't built around a builder's per-parser state.

## Decision

Inside `IPluginBuilder`, each parser is an instance of a new internal class (replacing `PluginParserImpl`).
Private fields hold the original unfiltered `parse` and the original tags. The class also holds the
parser's current name, file types, and tag filter. It produces the read-only `IParser` that cspell sees,
with the current filter compiled against the originals.

## Consequences

- Filtering again always starts from the originals, however many times a parser is renamed, duplicated,
  or filtered inside a builder.
- The class is internal. Only `IParser` is public.
- Still open: how the class gets the original unfiltered `parse` from an `IParser` created by another
  package's bundled copy of `@internal/utils`, e.g. in `parser-strings-comments`, which bundles the other
  packages' plugins.
