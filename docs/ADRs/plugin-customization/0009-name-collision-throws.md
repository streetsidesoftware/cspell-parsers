# 0009. A duplicate or rename that reuses an existing parser name throws

Status: Accepted

## Context

Plugin authors must never ship two parsers with the same name. A user's customization could still create
a clash, e.g. `duplicateParser('typescript', 'js-comments')` when `js-comments` already exists, or a rename
onto an existing name. Across plugins, cspell lets the last parser with a name win, which is how a user
deliberately replaces a parser. Within one plugin, though, the user writes every name
([0006](./0006-user-names-new-parsers.md)), so a clash is almost always a mistake.

The options were: throw, or replace the existing parser (last one wins, as in cspell). Replacing means a
typo silently deletes a parser, which [0005](./0005-user-perspective.md) rules out.

## Decision

A duplicate or rename that would reuse a name already in the plugin throws an error naming the parser and
the plugin. To replace a parser deliberately, the user removes it first, then duplicates or renames.

cspell CLI 10.3.3 reports an error thrown while loading a JS config clearly: it prints
`Configuration Error: Failed to read config file: "<path>"` followed by the error message, and exits 1.
This holds both for the config itself and for a JS config reached through a YAML `import`.

## Consequences

- Names in a customized plugin stay unique and deliberate. Mistakes surface when the config loads.
- Replacing a parser takes two visible steps.
- No extra `console.error` is needed. The thrown error already reaches the user through cspell's own
  configuration error reporting.
