# 0002. Parsers own file types; plugin file types and recommendations are derived

Status: Accepted

## Context

Today `IPlugin` stores three independent lists that nothing keeps consistent: the plugin's
`supportedFileTypes`, each `IParser`'s `supportedFileTypes`, and `recommendedLanguageSettings`
(`languageId` → parser name). Customizations such as removing a file type or duplicating a parser would
each have to update all three by hand.

A plugin can hold several parsers that list the same file type (e.g. `typescript` and a duplicated
`typescript-comments-only`). cspell's `languageSettings` can only choose one parser per language, so
something has to decide which one the `recommended` settings use. cspell itself resolves duplicate
parser _names_ by letting the last occurrence win.

## Decision

- Each parser owns its `supportedFileTypes`. Adding or removing a file type is a parser-level change.
- A plugin's `supportedFileTypes` is not stored. It is derived as the set of its parsers'
  `supportedFileTypes`. Removing a file type from a plugin removes it from every parser that lists it.
- Two parsers in the same plugin may list the same file type.
- Selecting parsers by file type returns every parser that lists it, possibly more than one.
- Recommended language settings are generated from the parsers, not stored. For each file type, the
  recommended parser is the last one (in the plugin's `parsers` order) that lists it, matching cspell's
  last-one-wins rule for parser names.

## Consequences

- The three lists can no longer drift out of sync, because only one of them is stored.
- The order of a plugin's `parsers` now matters: it decides which parser `recommended` uses for a shared
  file type. Every customization that adds or reorders parsers has to define where the parser ends up.
- `recommendedLanguageSettings` can't be hand-picked independently of the parsers. To change which parser
  a language is recommended with, you change the parsers' file types or their order.
