# 0010. `filterTagsForFileType` gives file types their own filtered parser

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

- file types, copying whichever parser handles them;
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

- **It targets file types, not parsers.** `fileType` is a file type or a list of them. The source is the
  parser that currently handles them, the last one that lists them, so the user doesn't need parser names.
  This is an exception to 0005's parser targets.
- **The user names the copy.** `newName` is required, and a taken name throws, as in 0005.
- **The file types move.** The copy lists only the given file types, and they're removed from the source
  parser. So `parserNamesFor` stays unambiguous and later parsers can't silently take them back.
- **The filter replaces, never chains.** `options` replaces the copied filter, as in
  [0006](./0006-tag-filtering.md).
- **The copy is appended.** Like `duplicateParser`, it goes to the end of the list.
- **Mistakes throw before anything changes.** Throws happen for a file type no parser lists, for file types
  that different parsers handle (one name can't cover two copies), and for `'*'`, which
  `filterTags('*', ...)` already covers.

## Consequences

- "A different filter for these file types" is one call, and the examples keep their intent.
- The source is resolved when the method is called. Later reordering or `addParser` doesn't change it.
- The source keeps its other file types. A source left with no file types stays in the plugin, as in 0003.
- The file types can't be spread across parsers in one call. Call the method once per source parser.
