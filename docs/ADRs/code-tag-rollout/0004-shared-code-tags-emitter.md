# 0004. Shared `code`-tag-gap-filling helper in `@internal/utils`

Status: Accepted

## Context

Both tree-sitter packages need the same range-gap-filling step (0003), and their `walk.ts` files are
already structurally parallel (the diff between them is backend setup — native `tree-sitter` vs.
`@vscode/tree-sitter-wasm` — not the walking logic itself). `@internal/utils` already exists for exactly
this kind of cross-package shared logic (`compileTagFilter`, `stripCommentMarkers`, `decodeStringParts`),
and — per `CLAUDE.md` — is safe to depend on for shared _runtime_ logic: the dist-size/dependency caution
in `CLAUDE.md` is specifically about a workspace dependency's _type_ declarations getting inlined whole
into `dist/*.d.ts` with no tree-shaking, not about sharing a small function's implementation.

While implementing the first scanner-based package (`parser-c-cpp-strings-comments`), it became clear this
same need isn't unique to the tree-sitter backends: every package in this rollout has to compute "whatever
byte range of the file the underlying scan/walk didn't already cover, tag it `code`." Originally (0002) each
scanner package was going to hand-roll its own copy of `parser-php-strings-comments`'s inline `j`-cursor/
`emitCodeSegment` pattern, duplicated per package. Doing that once for c-cpp and comparing it against the
tree-sitter design made the duplication obvious immediately - both are the exact same range-diffing logic,
just fed from a scanner's `Generator<ParsedText>` in one case and a tree walk's in the other. This decision
supersedes that part of 0002: **every** package in this rollout (scanner-based and tree-sitter-based alike)
uses one shared helper instead of each reimplementing its own copy - consistency across all parsers matters
more here than which package happened to be implemented first.

The chosen shape is a factory - `createCodeTagsEmitter(codeTags, fileContent)` returning a reusable
`ParsedTextEmitter` closure - rather than a single `fillCodeGaps(parsedTexts, content, codeTag)` generator
call as first proposed. It also asserts its `codeTags` argument is frozen, to catch a caller passing a fresh
object literal instead of the package's own module-level `TAGS.CODE` constant.

## Decision

`packages/internal-utils/src/codeTagEmitter.ts`:

```ts
import type { ParsedText } from '@cspell/cspell-types';

import { assert } from './assert.ts';

export type ParsedTextEmitter = (src: Iterable<ParsedText>) => Iterable<ParsedText>;

export function createCodeTagsEmitter<T extends Record<string, boolean>>(
  codeTags: T,
  fileContent: string,
): ParsedTextEmitter {
  assert(Object.isFrozen(codeTags), 'Tag object must be frozen');

  function* emitter(src: Iterable<ParsedText>): Iterable<ParsedText> {
    let i = 0;
    for (const item of src) {
      const [a, b] = item.range;
      if (a > i) {
        const text = fileContent.slice(i, a);
        yield { text, range: [i, a], tags: codeTags };
      }
      i = b;
      yield item;
    }
    if (i < fileContent.length) {
      yield { text: fileContent.slice(i), range: [i, fileContent.length], tags: codeTags };
    }
  }
  return emitter;
}
```

`fileContent` is the full source text (needed to slice actual gap text, not just track ranges); `codeTags` is
the calling package's own frozen `TAGS.CODE`-equivalent value, so this helper stays independent of any
package's tag vocabulary. It assumes `src` is already in non-decreasing `range` order (true for every
scanner's `Generator<ParsedText>` and both tree-sitter walkers) — it does not sort. `i` advances to each
item's `range[1]` unconditionally (not only when a gap was found before it), and any content left after the
loop — the tail of the file past the last item — is flushed as one final `code` segment.

**Every** package in this rollout wires its scan/walk generator through this one helper rather than
maintaining its own gap-filling logic, e.g. `parser-c-cpp-strings-comments/src/scanner.ts`:

```ts
run(): Iterable<ParsedText> {
  const codeInjector = createCodeTagsEmitter(TAGS.CODE, this.content);
  return codeInjector(this.scanTagged());
}
```

The two tree-sitter packages' `collectParsedTexts` wire `walk(...)` through the same helper. This
supersedes 0002's plan for each scanner package to duplicate PHP's inline `j`-cursor pattern —
`parser-php-strings-comments` itself is unchanged (out of scope for this rollout; it already has its own
working inline implementation and isn't being retrofitted here), but every package added _by this rollout_
uses `createCodeTagsEmitter` uniformly, whether it's scanner-based or tree-sitter-based.

Covered by `packages/internal-utils/src/codeTagEmitter.test.ts`, including regression coverage for two bugs
caught during implementation: `i` not advancing past an item's end when no gap preceded it (which duplicated
already-tagged text as a spurious `code` segment for adjacent items, and produced wrong trailing content
once a post-loop flush was added on top of the unfixed cursor), and the missing post-loop flush itself
before it existed at all.

## Consequences

- One implementation to maintain instead of one-per-package; every package gets `code` gap-filling with
  identical semantics, including edge cases (adjacent segments, leading/trailing gaps) that are easy to get
  subtly wrong when reimplemented by hand - as the bug history on this exact function during implementation
  demonstrates.
- `@internal/utils` gains a new export with no new type surface bloat risk: `createCodeTagsEmitter`'s only
  non-local types are `ParsedText` (already `@cspell/cspell-types`, already bundled everywhere) and a
  generic `T extends Record<string, boolean>` for the caller's own tag shape, not a type `@internal/utils`
  itself needs to import.
- A scanner package's `Scanner.run()` shrinks to a two-line wrapper (build the emitter, pipe the tagged
  generator through it) instead of maintaining its own trailing-cursor field and `emitCodeSegment` method -
  see `parser-c-cpp-strings-comments/src/scanner.ts` for the resulting shape, which every later scanner
  package in this rollout should match.
- The frozen-`codeTags` assertion means every package must define its `TAGS.CODE` constant via the existing
  `defineTag`/`Object.freeze` convention (already true everywhere) - passing an inline `{ code: true }`
  object literal fails fast with a clear error instead of silently working.
- If a future need arises for gap-filling logic beyond a single forward pass (e.g. merging adjacent `code`
  gaps, or handling out-of-order input), that's explicitly out of scope for this helper as decided here and
  needs its own follow-up decision rather than silently growing this function.
