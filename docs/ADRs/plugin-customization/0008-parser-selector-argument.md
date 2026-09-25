# 0008. Methods take the target parser as a required first argument, with `'*'` for all

Status: Accepted

## Context

Some changes target one parser. Others target the whole plugin. For example, a user might remove
`javascript` from `typescript` only, so a `js-comments` duplicate owns it, or remove it from every parser
because JavaScript shouldn't be handled at all. The same split applies to tag filters: one parser, or every
parser, as with `{ '*': true }`. A scoping `select()` step had already been rejected because it isn't
obvious that it works on a subset.

The options were: separate methods for the single-parser and plugin-wide forms; one method with a required
selector argument; or one method whose parser-name argument is optional, with the intended form worked out
from the arguments.

## Decision

Methods that change existing parsers take the target as a required first argument: a parser name, or `'*'`
for every parser in the plugin.

```js
plugin
  .removeFileTypes('*', ['javascript']) // every parser
  .filterTags('typescript', { '*': false, comment: true }); // one parser
```

This applies to `setFileTypes`, `addFileTypes`, `removeFileTypes`, and `filterTags`. Methods that create or
name a parser, such as `duplicateParser` and renaming, take a single parser name, because the result needs
exactly one name ([0006](./0006-user-names-new-parsers.md)).

## Consequences

- Every call shows its scope at the call site. There's no way to reach the whole plugin by leaving an
  argument out.
- The `'*'` form reads the same way as the `'*'` key in a tag filter.
- `'*'` can't also be a parser name.
- Still to decide: whether the selector should also accept a list of names, and what an unknown name does.
