# 0010. `filterTagsForFileType` gives a file type its own filtered parser

Status: Accepted

## Context

A common request is a different filter for some file types, such as "only doc comments in TypeScript
files". cspell never tells a parser which file type it's parsing ([0001](./0001-design-principles.md)), so
this always needs a separate parser, with its own name, selected for those file types. The builder can
already express it, but it takes three calls and the source parser's name:

```ts
plugin
  .customize()
  .duplicateParser('typescript-strings-comments', 'ts-doc-comments')
  .setFileTypes('ts-doc-comments', ['typescript'])
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
- **It only adds a parser.** It's exactly what a user would write: `duplicateParser`, then `setFileTypes` and
  `filterTags` on the copy. The copy lists only that file type and wins it by coming last. Existing parsers
  aren't changed. Removing the file type from the source was rejected: it changes a parser the user didn't
  name, so `languageSettingsFor(sourceName)`, used under `overrides` for example, would silently stop
  covering that file type.
- **The filter replaces, never chains.** `options` replaces the copied filter, as in
  [0006](./0006-tag-filtering.md).
- **The copy is appended.** Like `duplicateParser`, it goes to the end of the list.
- **Mistakes throw before anything changes.** Throws happen for a file type no parser lists, and for `'*'`,
  which `filterTags('*', ...)` already covers.

## Consequences

- "A different filter for this file type" is one call, and the examples keep their intent.
- The source is resolved when the method is called. Later reordering or `addParser` doesn't change it.
- `parserNamesFor(fileType)` lists both the source and the copy, and the last one is selected, as after a
  plain `duplicateParser`.
- Removing the copy later hands the file type back to the source.
- Giving several file types one filter takes a call per file type, each with its own name, or one call
  followed by `addFileTypes` on the copy. Either way the copies win by coming last.
