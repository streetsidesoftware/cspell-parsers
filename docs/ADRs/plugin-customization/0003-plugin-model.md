# 0003. A plugin is an ordered list of named parsers; file types only generate `languageSettings`

Status: Accepted

## Context

Today `IPlugin` stores three lists nothing keeps in sync: the plugin's `supportedFileTypes`, each parser's
`supportedFileTypes`, and `recommendedLanguageSettings`. Checking one file type differently from another that
the same parser handles needs a new parser, and a new parser needs a name
([0001](./0001-design-principles.md)).

Two models were weighed: a list of named parsers, where a per-file-type change splits off a parser; or
per-file-type settings from which named parsers are generated, with generated names documented as public
API. Generated names are names the user has to work out and type, which is the surprise 0001 rules out.

## Decision

- A plugin is an **ordered list of uniquely named parsers**, which is exactly what cspell sees.
- **The user names every parser** a customization creates. The plugin never generates names.
- A parser's `supportedFileTypes` only generate `languageSettings`. They don't restrict what a parser can be
  used for, since cspell selects parsers only by name.
- A plugin's file types aren't stored. They are the set of its parsers' file types.
- Several parsers may list the same file type. The **recommended parser** for a file type is the last one in
  `parsers` order that lists it, matching cspell's last-one-wins rule. Both `recommended` and
  `languageSettings()` are generated from that, never stored.
- A parser with no file types stays in the plugin, still usable by name. Only `removeParser` removes one.

## Consequences

- The file-type lists can't drift apart, because only the parsers' lists exist.
- The order of `parsers` matters, so every operation that adds a parser defines where it lands
  ([0005](./0005-builder-operations.md)).
- There's no one-call shortcut for a per-file-type change. It's a duplicate, a file-type change, and a
  filter, with a name the user chooses.
