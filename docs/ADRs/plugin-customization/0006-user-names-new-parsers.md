# 0006. The user names every parser a customization creates

Status: Accepted

## Context

Per [0005](./0005-user-perspective.md), a parser's name is the user's only handle on it. They write it in
`languageSettings` and `overrides[].languageSettings`. Some customizations need a new parser, such as
checking JavaScript differently from TypeScript when one parser handles both, because cspell never tells a
parser which file type it is parsing.

The options were: the plugin generates a name for the new parser (e.g. `typescript:javascript`) and
documents the naming scheme as public API, or the user always supplies the name.

This also settles the modeling question left open earlier. A plugin stays a list of named parsers, which
is what cspell sees, rather than a set of per-file-type settings with generated parsers.

## Decision

Any customization that creates a parser takes its name from the user. The plugin never generates parser
names. A plugin is modeled as an ordered list of uniquely named parsers.

```js
const custom = plugin
  .duplicateParser('typescript', 'js-comments')
  .setFileTypes('js-comments', ['javascript', 'javascriptreact'])
  .filterTags('js-comments', { '*': false, comment: true });
```

## Consequences

- The user never has to work out a name. Every parser name in their config is one they, or the plugin
  author, wrote.
- There is no one-call shortcut such as `setFileTypeTags('javascript', …)` unless it also takes a name.
- Per-file-type customization is a combination of duplicate, file-type changes, and tag filter.
