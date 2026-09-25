# Plugin customization

The `IPlugin`/`IParser` types in `@internal/utils` grew ad hoc as parser packages were added. This feature
replaces them with a deliberate model: each package exports an immutable `IPluginEx`, and users customize it
through an `IPluginBuilder` to rename, duplicate, add, or remove parsers, change their file types, and filter
their tags. The new types live alongside the old ones during the migration, then get folded back into
`IPlugin`/`IParser`.

## Decisions

| #    | Title                                                                                     | Status   |
| ---- | ----------------------------------------------------------------------------------------- | -------- |
| 0001 | Design from the plugin user's perspective, within cspell's rules                          | Accepted |
| 0002 | Breaking externally is allowed; the repo is never broken internally                       | Accepted |
| 0003 | A plugin is an ordered list of named parsers; file types only generate `languageSettings` | Accepted |
| 0004 | Packages export an immutable `IPluginEx`; users customize an `IPluginBuilder`             | Accepted |
| 0005 | Builder operations: explicit targets, predictable order, loud errors                      | Accepted |
| 0006 | Tag filters replace, never chain; defaults come only from `tags`                          | Accepted |
| 0007 | `IParserEx` is read-only data that carries its unfiltered parse and filter                | Accepted |
| 0008 | `customizePlugin` stays as a thin wrapper that returns a builder                          | Accepted |
| 0009 | `defineConfig` merges a plugin into the user's settings                                   | Accepted |

## Deliverables

- [Plugin author guide](../../guides/plugin-author-guide.md), linked from `CONTRIBUTING.md`.
