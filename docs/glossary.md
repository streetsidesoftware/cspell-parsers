# Glossary

Terminology introduced or clarified while designing features with the `feature-adr` skill. Alphabetical.

## `code` tag

A catch-all tag emitted for any parsed segment that isn't already covered by a more specific tag (`comment`,
`string`, `identifier`, etc.) — the leftover keywords, punctuation, operators, and numbers that make up the
rest of the source. Off by default (a consumer must opt in via `customizePlugin`), since it's the noisiest,
least useful thing to spell check. Established for `parser-php-strings-comments`; extended to the other
scanner- and tree-sitter-based parsers in
[code-tag-rollout/0002](./ADRs/code-tag-rollout/0002-code-tag-definition-and-default.md) and
[code-tag-rollout/0003](./ADRs/code-tag-rollout/0003-tree-sitter-code-tag-semantics.md).

## `createCodeTagsEmitter`

A shared factory in `@internal/utils` (`codeTagEmitter.ts`) that takes a frozen `code` `Tags` value and the
original file content, and returns a `ParsedTextEmitter` — a function taking an `Iterable<ParsedText>` and
yielding it back interleaved with new `code`-tagged segments filling any byte range the input didn't cover
(including the tail of the file after the last item). Used by every package in the code-tag rollout —
scanner-based (piping a `Scanner`'s tagged-segment generator through it) and tree-sitter-based (piping an
AST walk through it) alike — so gap-filling semantics are identical everywhere rather than each package
reimplementing its own copy. Established in
[code-tag-rollout/0004](./ADRs/code-tag-rollout/0004-shared-code-tags-emitter.md).

## `IParser`

The read-only parser type: `name`, `parse` (filtered, what cspell calls), `_parse` (unfiltered),
`supportedFileTypes`, `tags`, and its current tag filter options. It has no customization methods. It
replaced the old ad hoc `IParser` of the same name. It was called `IParserEx` during the migration. Established
in [plugin-customization/0007](./ADRs/plugin-customization/0007-parser-data.md).

## `IPlugin`

The immutable plugin each parser package exports. It replaced `@internal/utils`'s old ad hoc `IPlugin` of the
same name. It was called `IPluginEx` during the migration. It has read-only helpers (`getParser()`,
`hasParser()`, `parserNamesFor()`, `languageSettings()`, `languageSettingsFor()`, `defineConfig()`) and
`customize()`, which returns an `IPluginBuilder`. Established in
[plugin-customization/0002](./ADRs/plugin-customization/0002-compatibility-and-migration.md) and
[0004](./ADRs/plugin-customization/0004-immutable-plugin-and-builder.md), with `defineConfig()` added in
[0009](./ADRs/plugin-customization/0009-define-config.md).

## `IPluginBuilder`

The mutable object returned by `IPlugin.customize()`. Its customization methods (duplicate, add, rename,
remove, filter tags, change file types) change it in place and return it for chaining. It is usable directly
as a cspell plugin, and `build()` takes an immutable `IPlugin` snapshot. Established in
[plugin-customization/0004](./ADRs/plugin-customization/0004-immutable-plugin-and-builder.md). The name is
provisional.

## Parser file types

A parser's `supportedFileTypes`: the file types used to generate `languageSettings` for it (`recommended`,
`languageSettings()`, `languageSettingsFor`). They don't restrict what the parser can be used for. cspell
selects a parser only by name. Established in
[plugin-customization/0003](./ADRs/plugin-customization/0003-plugin-model.md).

## Recommended parser

For a given file type, the parser a plugin's `recommended` settings select: the last parser in the plugin's
`parsers` order that lists that file type. It is derived, never stored. Established in
[plugin-customization/0003](./ADRs/plugin-customization/0003-plugin-model.md).
