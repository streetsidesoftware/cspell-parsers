# Plugin customization

`IPlugin`/`IParser` in `@internal/utils` grew ad hoc as parser packages were added. This feature designs
`IPluginEx` (and an `IPluginImpl` built on it) as a deliberate, immutable model for customizing a plugin —
renaming, duplicating, tag-filtering, and adjusting the file types of its parsers — to be folded back into
`IPlugin` once every parser package has been upgraded.

## Decisions

| #    | Title                                                                 | Status   |
| ---- | --------------------------------------------------------------------- | -------- |
| 0001 | Compatibility policy: breaking externally, never internally           | Accepted |
| 0002 | Parsers own file types; plugin file types and recommendations derived | Accepted |
| 0003 | A duplicated parser is appended to the end of the plugin's parsers    | Accepted |
| 0004 | Users customize a plugin through chained, immutable methods           | Accepted |

## Open questions

- **Name collisions** from a user's rename or duplicate. Deferred until the user scenarios are settled, then
  to be checked against the rules. Plugin authors must not ship two parsers with the same name. The open
  question is only about what happens when a user's customization would create a collision.
