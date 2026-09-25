# 0010. `filterTagsForFileType` gives a file type its own filtered parser

Status: Accepted

## Context

A common request is a different filter for some file types, such as "only doc comments in TypeScript
files". cspell never tells a parser which file type it's parsing ([0001](./0001-design-principles.md)), so
this always needs a separate parser, with its own name, selected for those file types. The builder can
already express it, but it takes four calls:

```ts
plugin
  .customize()
  .duplicateParser('typescript-strings-comments', 'ts-doc-comments')
  .setFileTypes('ts-doc-comments', ['typescript'])
  .removeFileTypes('typescript-strings-comments', ['typescript'])
  .filterTags('ts-doc-comments', { '*': false, 'comment.block.doc': true });
```

Once `defineConfig` ([0009](./0009-define-config.md)) covers every parser, a simpler example that uses
`filterTags('*', ...)` loses the "only TypeScript" part of its intent.

Three shapes were weighed:

- a file type, copying whichever parser handles it;
- an explicit source parser plus file types, which saves the least typing and needs the parser's name;
- a filter per file type hidden behind one parser name, with generated parsers underneath. It was rejected:
  it breaks the rule that users name every parser ([0003](./0003-plugin-model.md),
  [0005](./0005-builder-operations.md)), and a user's own `languageSettings` entry for the base name would
  silently bypass the filter.

## Decision

`IPluginBuilder` gets `filterTagsForFileType(fileType, options, newName)`:

```ts
export default customizePlugin()
  .filterTagsForFileType('typescript', { '*': false, 'comment.block.doc': true }, 'ts-doc-comments')
  .defineConfig();
```

- **It targets a file type, not a parser.** `fileType` is a single file type. The source is the parser that
  currently handles it, the last one that lists it, so the user doesn't need parser names. This is an
  exception to 0005's parser targets.
- **One file type per call.** A list was rejected: file types handled by different parsers would need
  several copies under one name, and the rule for that is harder to explain than a second call.
- **The user names the copy.** `newName` is required, and a taken name throws, as in 0005.
- **The file type moves.** The copy lists only that file type, and it's removed from every other parser
  that lists it. So `parserNamesFor` stays unambiguous, and the result doesn't depend on order.
- **The filter replaces, never chains.** `options` replaces the copied filter, as in
  [0006](./0006-tag-filtering.md).
- **The copy is appended.** Like `duplicateParser`, it goes to the end of the list.
- **Mistakes throw before anything changes.** Throws happen for a file type no parser lists, and for `'*'`,
  which `filterTags('*', ...)` already covers.

## Consequences

- "A different filter for this file type" is one call, and the examples keep their intent.
- The source is resolved when the method is called. Later reordering or `addParser` doesn't change it.
- The other parsers keep their other file types. A parser left with no file types stays in the plugin, as
  in 0003.
- Giving several file types one filter takes a call per file type, each with its own name, or one call
  followed by `addFileTypes` on the copy. With `addFileTypes`, the added file types stay on the original
  parser too, and the copy wins them only by coming later.
