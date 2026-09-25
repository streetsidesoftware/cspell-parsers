# 0016. A builder method's target can also be a list of parser names

Status: Accepted

## Context

[0008](./0008-parser-selector-argument.md) made the target a required first argument: one parser name, or
`'*'`. To change every parser that handles a file type, the user needs the parsers' names, which
`parserNamesFor(fileType)` returns ([0015](./0015-immutable-plugin-and-builder.md)). The options were to
also accept a list of names as the target, or to keep single targets and have the user loop.

## Decision

The target of a builder method that changes existing parsers is a parser name, a list of parser names, or
`'*'`.

```js
const b = plugin.customize();
b.filterTags(b.parserNamesFor('javascript'), { '*': false, comment: true });
```

`parserNamesFor(fileType)` returns the names of every parser that lists `fileType`, in plugin order. An
empty list does nothing. An unknown name anywhere in the list throws
([0010](./0010-unknown-parser-name-throws.md)), before any change is made.

Methods that create or name a parser (`duplicateParser`, `renameParser`) still take a single name.

## Consequences

- Selecting by file type needs no special target form. It is a plain list the user can inspect.
- The parsers selected are changed as a whole, so a filter applied through `parserNamesFor('javascript')`
  also affects the other file types those parsers handle. Seeing the names makes this easier to notice.
