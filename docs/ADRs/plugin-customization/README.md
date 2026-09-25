# Plugin customization

`IPlugin`/`IParser` in `@internal/utils` grew ad hoc as parser packages were added. This feature designs
`IPluginEx` (and an `IPluginImpl` built on it) as a deliberate, immutable model for customizing a plugin —
renaming, duplicating, tag-filtering, and adjusting the file types of its parsers — to be folded back into
`IPlugin` once every parser package has been upgraded.

## Decisions

| #    | Title                                                                                     | Status   |
| ---- | ----------------------------------------------------------------------------------------- | -------- |
| 0001 | Compatibility policy: breaking externally, never internally                               | Accepted |
| 0002 | Parsers own file types; plugin file types and recommendations derived                     | Accepted |
| 0003 | A duplicated parser is appended to the end of the plugin's parsers                        | Accepted |
| 0004 | Users customize a plugin through chained, immutable methods                               | Accepted |
| 0005 | Design from the plugin user's perspective, within cspell's rules                          | Accepted |
| 0006 | The user names every parser a customization creates                                       | Accepted |
| 0007 | Plugins generate `languageSettings` through helper methods                                | Accepted |
| 0008 | Methods take the target parser as a required first argument, with `'*'` for all           | Accepted |
| 0009 | A duplicate or rename that reuses an existing parser name throws                          | Accepted |
| 0010 | An unknown parser name throws                                                             | Accepted |
| 0011 | A parser's file types only feed `languageSettings` generation; a parser with none is kept | Accepted |
| 0012 | `filterTags` replaces a parser's filter; filters are never chained                        | Accepted |

## Open questions

## Deliverables

- A guide for plugin authors, covering [0005](./0005-user-perspective.md)'s user model and cspell's rules.
