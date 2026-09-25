# 0005. Builder operations: explicit targets, predictable order, loud errors

Status: Accepted

## Context

Some changes target one parser, others several or all of them. A scoping `select()` step was rejected
because it isn't obvious that it works on a subset. Separate single-parser and plugin-wide methods, or an
optional target inferred from the arguments, were rejected as less visible than a required target.

Because the last parser listing a file type is the recommended one ([0003](./0003-plugin-model.md)), each
operation that adds or renames a parser changes which parser handles a shared file type unless its position
is defined.

Within one plugin the user writes every name, so a name clash or an unknown name is almost always a
mistake. Replacing on a clash, as cspell does across plugins, would let a typo silently delete a parser; doing
nothing on an unknown name would leave a filter silently unapplied.

## Decision

**Targets.** Methods that change existing parsers (`filterTags`, `setFileTypes`, `addFileTypes`,
`removeFileTypes`, `removeParser`) take a required first argument: a parser name, a list of names, or `'*'`
for every parser. An empty list does nothing. Methods that create or name a parser take a single name.

```js
const b = plugin.customize();
b.removeFileTypes('*', ['javascript']);
b.filterTags(b.parserNamesFor('php'), { '*': false, comment: true });
```

**Operations.**

- `duplicateParser(name, newName)` copies the parser's current state (file types and filter) at that point
  in the chain, and appends the copy to the end.
- `addParser(parser, asName?)` appends an `IParserEx` from any plugin, keeping its file types and filter
  ([0007](./0007-parser-data.md)), under `asName` or its own name.
- `renameParser(name, newName)` changes only the name. The parser keeps its position, file types, and filter.
- `removeParser(target)` removes parsers, `'*'` included, so a plugin can be assembled from scratch.
- `setFileTypes`, `addFileTypes`, and `removeFileTypes` change parsers' file types and never remove a parser.

**Errors.** A duplicate, rename, or add that reuses a name already in the builder throws. An unknown name in
any target, or in `getParser` or `languageSettingsFor`, throws with the list of existing names, before any
change is made. `'*'` on a plugin with no parsers does nothing.

## Consequences

- Every call shows its scope, and a parser's position only changes when the user adds one.
- Duplicating a parser switches `recommended` to the copy for every file type they share. To keep the
  original for some types, remove them from the copy.
- Replacing a parser takes two visible steps: remove it, then add or duplicate under its name. Renaming
  and moving to the end is `duplicateParser` then `removeParser`.
- Mistakes surface when the config loads. cspell CLI 10.3.3 prints
  `Configuration Error: Failed to read config file: "<path>"` with the message and exits 1, including for a
  JS config reached through a YAML `import`, so no extra `console.error` is needed.
- `'*'` can't be a parser name.
