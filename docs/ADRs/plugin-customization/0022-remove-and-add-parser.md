# 0022. `removeParser` takes any target; `addParser` adds a parser from anywhere

Status: Accepted

## Context

`removeParser` could take the same target as the other builder methods (a name, a list, or `'*'`, per
[0008](./0008-parser-selector-argument.md) and [0016](./0016-target-accepts-name-list.md)), or leave out
`'*'` so a plugin can't be emptied. An empty builder is useful for a plugin author who wants to assemble a
plugin from parsers taken from other plugins. Because a parser is read-only data
([0017](./0017-parser-is-read-only.md)), adding one to a builder can't change the plugin it came from.

## Decision

- `removeParser(target)` takes the same target as every other method, `'*'` included.
- `addParser(parser: IParserEx, asName?: string)` adds a parser to the builder, appended to the end like a
  duplicate ([0003](./0003-duplicate-appends.md)). `asName` gives it a new name. Without `asName`, it keeps
  its own name. Either way, a name already in the builder throws ([0009](./0009-name-collision-throws.md)).

`IParserEx` is the read-only parser type ([0017](./0017-parser-is-read-only.md),
[0020](./0020-parser-exposes-unfiltered-parse.md)). Like `IPluginEx`, it lives alongside today's `IParser`
until every package has migrated.

## Consequences

- A plugin can be assembled from scratch: `plugin.customize().removeParser('*').addParser(…)`.
- `addParser` works with parsers from any package, because the builder only needs the parser's public
  data.
- An added parser keeps the filter it had in its source plugin
  ([0023](./0023-parser-carries-filter-and-get-parser.md)).
