# Contributing to @cspell/parser-typescript

This package is a thin alias for `@cspell/parser-typescript-tree-sitter-wasm`, its one production dependency.
`src/plugin.ts` builds a plugin named `typescript` from that package's parsers, the same objects, one per file
type. `index.ts` and `recommended.ts` are the ordinary wiring layer described in the repo root
`CONTRIBUTING.md`. The parsing logic, and the walkthrough of how it works, live in
`packages/parser-typescript-tree-sitter-wasm` (see its `CONTRIBUTING.md`).

The root `CONTRIBUTING.md` points here for the tagging convention, so it's repeated below.

## Tags

Each segment carries `tags`. A tag is a dot-separated hierarchical name used
as the key of the `ParsedTags` object, with `true` as its value (e.g. `'comment.block.doc': true`), not a
category-name key holding a subtype string - this is what lets a consumer match a broad key like
`comment.block` against a more specific tag like `comment.block.doc`. See `README.md`'s
[Tags](README.md#tags) table for what each one means to a consumer.

`hierarchicalTags(tag)` builds the whole ancestor chain for a dotted tag - e.g.
`hierarchicalTags('comment.block.doc')` is `{ comment: true, 'comment.block': true, 'comment.block.doc':
true }` - so every leaf's `tags` object carries all of its ancestors, not just the most specific segment.
Emitting the whole chain means a consumer can filter on `tags.comment` directly, without needing its own
prefix-matching logic just to ask "is this any kind of comment?"

The set of possible tags is fixed and known ahead of time, so `hierarchicalTags` is only ever called at
module load time, to build module-level constants (`STRING_SINGLE_QUOTE_TAG`, `COMMENT_BLOCK_DOC_TAG`,
`identifierTagByKind.property`, ...) - never per emitted segment. `quoteTag`/`commentTag` return one of
those shared constants rather than allocating a fresh object per leaf, and `identifierTagByKind` (a
`Record<IdentifierKind, ParsedTags>`) is indexed directly rather than built per identifier.

- Strings (`quoteTag`): `string.singleQuote`, `string.doubleQuote`, or bare `string` for anything else.
  Template literal fragments are tagged `string.templateLiteral` directly at their emit site.
- Comments (`commentTag`): `comment.line`, `comment.block`, or `comment.block.doc` for a leading `/**`.
- Identifiers (`identifierTagByKind`): `identifier.<kind>`, where `<kind>` is an `IdentifierKind` -
  `variable`, `property`, `privateProperty`, `type`, `shorthandProperty`, `label`, `importBinding`,
  `exportBinding`.

`tags` is the sole structured output for filtering - e.g. the import/export logic below is implemented in
terms of _not emitting_ certain segments at all, but a consumer with different needs could instead filter on
`tags.identifier` for "any kind of identifier", or on the more specific `tags['identifier.<kind>']` for one
particular kind (see `packages/parser-typescript-tree-sitter-wasm/src/parsers.test.ts`'s `identifierKind` helper, which reads the specific kind back off that
key).

## Testing

The parsing behavior is tested in `packages/parser-typescript-tree-sitter-wasm`. The tests here only check
the wiring: the plugin holds the wasm backend's parsers, and `customizePlugin` and `recommended` work.
`samples/` mirrors the wasm package's samples, so `pnpm run test:cspell` still runs every usage pattern end to
end.
