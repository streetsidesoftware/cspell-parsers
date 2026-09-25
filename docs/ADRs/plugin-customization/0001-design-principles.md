# 0001. Design from the plugin user's perspective, within cspell's rules

Status: Accepted

## Context

This repo exists so cspell users can control what gets spell checked. The `IPlugin` and `IParser` types in
`@internal/utils` grew ad hoc as packages were added, and hit scaling and consistency problems. Redesigning
them could start from the types, or from what a user writes in their config.

cspell fixes the following, and this repo can't change it:

- A parser is registered only through a plugin, in the `plugins` setting of `AdvancedCSpellSettings`.
- A parser is referred to only by its name.
- cspell collects parsers in declaration order, and the last parser with a given name wins. That lets a
  user replace a parser with a newer plugin's parser of the same name.
- `languageSettings` connects file types to parsers by name. `overrides[].languageSettings` does the same by
  filename or location.
- A parser is never told which file type it is parsing. `parse(content, filename)` gets only the content and
  filename.

## Decision

Every capability is designed and judged from the plugin user's point of view. The goal is a cspell
configuration that is simple, easy, and obvious, with no surprises. An API that is neater internally but
surprises a user loses.

A customization produces only what cspell can express: plugins holding uniquely named parsers, connected to
file types through `languageSettings`. Nothing depends on a parser knowing its file type. Two file types that
need different behavior go to two parsers with different names.

These principles are written up for plugin authors in the
[plugin author guide](../../guides/plugin-author-guide.md).

## Consequences

- Every other decision here answers "what does the user write, and what happens?".
- Parser names are the user's handle on everything, so any rule about names is public API.
