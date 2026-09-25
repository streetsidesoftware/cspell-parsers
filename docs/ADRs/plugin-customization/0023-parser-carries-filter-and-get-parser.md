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
  `IParserEx`.

```js
const b = pluginB.customize().addParser(commentsOnly.getParser('typescript'), 'a-comments');
```

## Consequences

- A parser moved between plugins keeps both its unfiltered source and its current filter, so it can be
  re-filtered from the original output ([0012](./0012-filter-tags-replaces.md)) or left as it is.
- `IParserEx` is plain data that fully describes a parser's current behavior.
- The exact field name is provisional.
- Still to decide: what `getParser` does with an unknown name.
