# 0010. An unknown parser name throws

Status: Accepted

## Context

Every method that targets a parser takes its name ([0008](./0008-parser-selector-argument.md)), and so does
`languageSettingsFor` ([0007](./0007-language-settings-helpers.md)). A typo such as
`filterTags('typscript', …)` names a parser the plugin doesn't have. Doing nothing would leave the plugin
unchanged, so the user's filter would silently never apply, which [0005](./0005-user-perspective.md) rules
out.

## Decision

A method or `languageSettingsFor` given a parser name the plugin doesn't have throws. The error names the
missing parser and lists the parsers the plugin does have. This matches
[0009](./0009-name-collision-throws.md).

`'*'` on a plugin with no parsers is not an error. It does nothing, and `languageSettingsFor` isn't
affected because it never takes `'*'`.

## Consequences

- A typo surfaces when the config loads, with the valid names right in the message.
- Code that customizes several plugins generically can't target a parser name that only some of them
  have. It has to check `parsers` first, or use `'*'`.

<!-- cspell:ignore typscript -->
