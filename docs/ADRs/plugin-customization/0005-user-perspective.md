# 0005. Design from the plugin user's perspective, within cspell's rules

Status: Accepted

## Context

The design had started from the shape of `IParser`/`IPlugin` and drifted into modeling questions (for
example, named parsers versus settings per file type) before settling what a user actually sees and
does. This repo exists so that users of cspell can control what gets spell checked, so the design has to
start from them.

What cspell already fixes, and this repo can't change:

- A parser is registered with cspell only through a plugin, in the `plugins` setting of
  `AdvancedCSpellSettings`.
- A parser is referred to only by its name.
- cspell collects parsers in the order they are declared. If two have the same name, the last one wins,
  which lets a user replace or update a parser by adding a newer plugin that has a parser with that
  name.
- `languageSettings` is the best place to associate a file type with a parser, by name.
  `overrides[].languageSettings` associates a parser with files by filename or location.

What this repo offers:

- Every parser package provides a plugin, and the plugin comes with recommended settings.
- A plugin has one or more parsers.
- Each parser has a name and is designed for one or more file types.

## Decision

Every customization capability is designed and judged from the plugin user's point of view. The user's
goal is to use a plugin and its parsers to control what gets spell checked, with a cspell configuration
that is simple, easy, and obvious, with no surprises. An API that is neater internally but surprises a
user loses.

A customization produces only what cspell's own model can express: plugins holding uniquely named parsers,
connected to file types through `languageSettings` or `overrides[].languageSettings`. Nothing may depend on a
parser knowing which file type it is parsing, because cspell never tells it.

Before this feature is finished, the principles above will be written up as a guide for plugin authors.

## Consequences

- Every later ADR in this feature has to answer the question "what does the user write, and what
  happens?", not only "what does the type look like?".
- Parser names are the user's handle on everything. Any name a customization creates or changes is
  user-facing, so naming rules count as public API.
- The plugin author guide is a deliverable of this feature, not an afterthought.
