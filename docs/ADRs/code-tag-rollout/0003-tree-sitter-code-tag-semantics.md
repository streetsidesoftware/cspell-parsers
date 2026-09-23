# 0003. Tree-sitter `code` tag semantics (range-gap catch-all)

Status: Accepted

## Context

`parser-typescript-tree-sitter`'s `walk.ts` (and its near-identical `-wasm` sibling) already tags every
comment, string/template fragment, and identifier it visits (`TAGS.IDENTIFIER_BY_KIND` covers variables,
properties, types, labels, import/export bindings, etc. — all on by default today). Anything else in the
file — keywords (`const`, `function`, `return`), punctuation (`{ } ( ) ; ,`), operators, numeric literals,
and whitespace — is never visited by anything that yields a `ParsedText`. It isn't mistagged; it's simply
absent from `parsedTexts` today.

Two ways to fill that in were considered:

1. Walk every currently-ignored tree-sitter node type explicitly (keyword tokens, punctuation nodes,
   `number` nodes, etc.) and tag each one `code` as the walker visits it.
2. Leave the walker exactly as it is, and after collecting its output, fill whatever byte ranges of
   `content` it didn't cover with `code`-tagged segments, computed from ranges rather than node kinds.

Option 1 requires enumerating and hand-tagging tree-sitter's often-numerous anonymous token types (which
differ somewhat between the native and wasm grammars' node sets) and keeps that enumeration in sync as the
grammar evolves. Option 2 needs no knowledge of tree-sitter node types at all — it only needs the walker's
existing output plus the source text.

## Decision

We will use the range-gap approach (option 2): the walker (`walk.ts`) keeps working exactly as it does
today, and its output gets passed through `createCodeTagsEmitter` (see
[0004](./0004-shared-code-tags-emitter.md)) to fill any byte range of `content` not already covered by a
yielded `ParsedText`, tagged `code`. This includes whitespace-only gaps — no special-casing to skip them,
matching how PHP's scanner also yields raw code chunks (whitespace included) rather than trimming them.

`code` is added to both tree-sitter packages' `tagsAndMeaning` as a flat, top-level tag (same shape as the
scanner packages' `code`, per [0002](./0002-code-tag-definition-and-default.md)) and to their
`NOT_ON_BY_DEFAULT` set — both packages need this set introduced, since neither currently has an
off-by-default tag at all (every tag in `tags` today is `true`).

## Consequences

- No change needed to `walk.ts`'s actual traversal logic — `code` is filled in entirely at the
  `collectParsedTexts` boundary, keeping the walker's per-construct logic focused on what it already does
  well (comments/strings/identifiers).
- `code` never overlaps with `identifier` (or any of its subtags): identifiers are already fully covered by
  the walker's own output and stay on-by-default, so they're unaffected by this change — only genuinely
  untagged bytes (keywords, punctuation, operators, numbers, whitespace) become `code`.
- If the walker is later extended to tag some currently-ignored construct explicitly (e.g. a future
  `keyword` tag), that construct's ranges simply stop showing up as `code` gaps automatically — no
  `createCodeTagsEmitter` change needed.
- Relies on the walker's yielded `ParsedText`s being in non-decreasing `range` order (true today, since the
  recursive descent visits nodes in source order) — `createCodeTagsEmitter` assumes this rather than sorting, per
  [0004](./0004-shared-code-tags-emitter.md)'s scope.
