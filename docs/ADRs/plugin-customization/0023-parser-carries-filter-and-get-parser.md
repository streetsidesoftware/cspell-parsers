# 0023. `IParserEx` carries its filter options; plugins and builders have `getParser(name)`

Status: Accepted

## Context

A parser taken from a customized plugin has a filter compiled into its `parse`. With only `_parse` and
`tags` ([0020](./0020-parser-exposes-unfiltered-parse.md)) visible, a builder receiving it through
`addParser` ([0022](./0022-remove-and-add-parser.md)) can't know that filter. It would start again from the
author's defaults, so the added parser would behave differently from the one the user took. That's the
surprise [0013](./0013-duplicate-copies-current-state.md) avoided for duplicates.

Getting a parser out of a plugin also meant indexing `parsers` by hand.

## Decision

- `IParserEx` has a public, read-only field with the tag filter options currently compiled into its
  `parse`, e.g. `filterTags?: TagFilterOptions`. It is absent when the parser uses the author's defaults.
  `addParser` copies it, so an added parser behaves exactly as it did in its source plugin.
- `IPluginEx` and `IPluginBuilder` both have a read-only `getParser(name)` that returns that parser as an
  `IParserEx`. An unknown name throws, as in [0010](./0010-unknown-parser-name-throws.md). Both also have
  `hasParser(name)` for checking whether a parser exists without a try/catch.

```js
const b = pluginB.customize().addParser(commentsOnly.getParser('typescript'), 'a-comments');
```

## Consequences

- A parser moved between plugins keeps both its unfiltered source and its current filter, so it can be
  re-filtered from the original output ([0012](./0012-filter-tags-replaces.md)) or left as it is.
- `IParserEx` is plain data that fully describes a parser's current behavior.
- The exact field name is provisional.
- The `parser-strings-comments` bundle's existing `getParser(fileType?)` and `getParserName(fileType?)`,
  which look parsers up by file type, are replaced rather than deprecated. Both take one string, so an
  overload can't tell a file type from a name. The same lookup is `parserNamesFor(fileType)`
  ([0016](./0016-target-accepts-name-list.md)). The bundle's `samples/plugin/cspell.config.mts` calls
  `plugin.getParser('php')?.name`, and under this decision that call throws (the PHP parser is named
  `php-strings-comments`), so the sample must move to `languageSettingsFor` or `parserNamesFor`.
