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
| 0005 | Design from the plugin user's perspective, within cspell's rules      | Accepted |

## Open questions

- **Name collisions** from a user's rename or duplicate. Deferred until the user scenarios are settled, then
  to be checked against the rules. Plugin authors must not ship two parsers with the same name. The open
  question is only about what happens when a user's customization would create a collision.
- **Plugin model (next question to ask).** cspell chooses a parser by name, and `parse()` never learns the
  `languageId`, so different behavior for two file types needs two differently named parsers. That makes
  `setFileTypeTags('javascript', …)` on a parser that handles both JS and TS impossible under the current
  model. Options: **(X)** keep a list of named parsers and have per-file-type changes split off a parser
  with a generated name, or **(Y)** store one setting per file type (engine + tag filter) and generate the
  named parsers from those, which would partly supersede 0002/0003. Either way, the generated names become
  public API.
- **Parser selection.** A scoping `select()` step was rejected because it isn't obvious that it works on a
  subset. Choosing between name-only methods and a selector argument waits on the plugin model.

## Deliverables

- A guide for plugin authors, covering [0005](./0005-user-perspective.md)'s user model and cspell's rules.
