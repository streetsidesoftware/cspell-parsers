# 0004. Users customize a plugin through chained, immutable methods

Status: Superseded by [0015](./0015-immutable-plugin-and-builder.md)

## Context

A plugin user customizes a plugin by combining several operations. For example, to check only comments
in TypeScript files while leaving JavaScript alone, they duplicate the `typescript` parser, narrow the
copy's file types, and filter the copy's tags. Two API shapes were considered:

- **Chained methods**: each call returns a new plugin, e.g.
  `plugin.duplicateParser(...).setFileTypes(...).filterTags(...)`.
- **One options object**: a single `customizePlugin({ parsers: { ... } })` call describes the end state.
  Its merge rules would need defining, e.g. whether an entry edits an existing parser or copies another
  parser over it.

Since [0002](./0002-parsers-own-file-types.md), the order of `parsers` decides which parser `recommended`
uses, so it matters that the user can see the order in which parsers get added.

## Decision

We will expose plugin customization as methods on `IPluginEx`. Each method returns a new `IPluginEx` and
leaves the receiver unchanged, and a customization is written as a chain of calls. We will not build an
options-object API now. The method names used in the example above are illustrative only; the real ones
will be decided separately.

## Consequences

- The order of the chain is the order of the operations, so the order of `parsers` (and therefore
  `recommended`) can be predicted from the code.
- Every operation needs its own method with its own rules, including name collisions and what happens when
  no parser matches.
- Customization needs a JS/TS cspell config, the same limitation `customizePlugin` has today.
- An options-object API can be layered on top of the methods later if it's wanted.
