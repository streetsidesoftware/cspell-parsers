# 0011. A parser's file types only feed `languageSettings` generation; a parser with none is kept

Status: Accepted

## Context

`removeFileTypes('*', …)` ([0008](./0008-parser-selector-argument.md)) can leave a parser with no file types,
e.g. a `js-comments` duplicate that only listed the JavaScript types. The options were to keep the parser,
drop it automatically, or throw.

What a parser's file types are for decides it. cspell selects a parser by name through `languageSettings`
or `overrides[].languageSettings` ([0005](./0005-user-perspective.md)). It never reads a parser's file-type
list. The list is only used to generate `languageSettings`, via `recommended`, `languageSettings()`, and
`languageSettingsFor(name)` ([0007](./0007-language-settings-helpers.md)).

## Decision

A parser's file types are helpers for generating `languageSettings`, and nothing more. They don't restrict
which files a parser can be used for. A parser left with no file types stays in the plugin. It is still
registered with cspell and still usable by name. Only `removeParser` removes a parser.

## Consequences

- `languageSettings()` generates nothing for a parser with no file types, and `languageSettingsFor(name)`
  without explicit file types returns `[]` for it.
- A parser never disappears as a side effect of a file-type change, so a later reference to it by name
  still works ([0010](./0010-unknown-parser-name-throws.md)).
- "Parsers own file types" ([0002](./0002-parsers-own-file-types.md)) means they own this generation
  metadata, not a restriction on what they can parse.
