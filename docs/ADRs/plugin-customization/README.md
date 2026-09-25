# Plugin customization

`IPlugin`/`IParser` in `@internal/utils` grew ad hoc as parser packages were added. This feature designs
`IPluginEx` (and an `IPluginImpl` built on it) as a deliberate, immutable model for customizing a plugin —
renaming, duplicating, tag-filtering, and adjusting the file types of its parsers — to be folded back into
`IPlugin` once every parser package has been upgraded.

## Decisions

This feature is still being designed. An Accepted ADR here can still be revised or superseded before
implementation.

| #    | Title                                                                                     | Status             |
| ---- | ----------------------------------------------------------------------------------------- | ------------------ |
| 0001 | Compatibility policy: breaking externally, never internally                               | Accepted           |
| 0002 | Parsers own file types; plugin file types and recommendations derived                     | Accepted           |
| 0003 | A duplicated parser is appended to the end of the plugin's parsers                        | Accepted           |
| 0004 | Users customize a plugin through chained, immutable methods                               | Superseded by 0015 |
| 0005 | Design from the plugin user's perspective, within cspell's rules                          | Accepted           |
| 0006 | The user names every parser a customization creates                                       | Accepted           |
| 0007 | Plugins generate `languageSettings` through helper methods                                | Accepted           |
| 0008 | Methods take the target parser as a required first argument, with `'*'` for all           | Accepted           |
| 0009 | A duplicate or rename that reuses an existing parser name throws                          | Accepted           |
| 0010 | An unknown parser name throws                                                             | Accepted           |
| 0011 | A parser's file types only feed `languageSettings` generation; a parser with none is kept | Accepted           |
| 0012 | `filterTags` replaces a parser's filter; filters are never chained                        | Accepted           |
| 0013 | `duplicateParser` copies the original's current state                                     | Accepted           |
| 0014 | A renamed parser keeps its position                                                       | Accepted           |
| 0015 | Packages export an immutable `IPluginEx`; customization happens on an `IPluginBuilder`    | Accepted           |
| 0016 | A builder method's target can also be a list of parser names                              | Accepted           |
| 0017 | `IParser` is read-only data with no customization methods                                 | Accepted           |
| 0018 | The builder holds each parser in a class that privately keeps its originals               | Accepted           |

## Open questions

## Deliverables

- A guide for plugin authors, covering [0005](./0005-user-perspective.md)'s user model and cspell's rules.
