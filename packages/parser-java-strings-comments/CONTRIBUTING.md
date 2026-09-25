# Contributing to @cspell/parser-java-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

This parser is a single hand-written scanner (`Scanner`, a small stateful class holding a mutable cursor `i`
over `content`). There's no AST and no tokenizer for the language as a whole - `Scanner.run` walks `content`
character by character, recognizing only the handful of constructs that matter (comments and strings).
Everything between them (identifiers, keywords, punctuation, numbers) is emitted as a `code` segment. `code`
is `false` in `tags`, so the default filter built by `createPluginParserWithFilterTags` drops it, and a user
can turn it back on with `customizePlugin`.

Unlike the JS/TS-family split (`@cspell/parser-typescript-strings-comments`), Java has none of the
ambiguities that make that scanner's `scanCode` recursive: there's no string interpolation, so nothing needs
to recurse back into "ordinary code" mid-literal, and there's no regex-literal-vs-division ambiguity to
resolve. `run` is therefore a single flat loop over the whole file with no `end`/`stopAtUnmatchedBrace`
parameters, and every scan method (`scanLineComment`, `scanBlockComment`, `scanQuotedString`,
`scanJavaTextBlock`) returns exactly one `ParsedText` directly - there's no `emitFragment`-style generator
here, since nothing ever needs to split a single literal into more than one segment.

### The `"""` vs `"..."` dispatch boundary

A `"` only starts a text block once the scanner has confirmed the next _two_ characters are also `"`
(`content[this.i + 1] === '"' && content[this.i + 2] === '"'`) - otherwise it falls through to an ordinary
`scanQuotedString('"')` call, exactly the same dispatch order the combined `@cspell/parser-strings-comments`
package used for its `'java'` dialect. This is why an empty string (`""`) right before a real text block, or
a text block whose content happens to start with a quote character, are both still handled correctly - see
`parser.test.ts`'s `""" vs "..." dispatch boundary` tests, which would fail if this look-ahead were shortened
to only checking one extra character.

### Emitting a segment

Every scan method builds a single `ParsedText` from a `[start, end)` range it already knows. `range` is the
offset of the segment in the original `content`, not in `text`/`rawText` - it's what cspell uses to map a
spelling issue found in the parsed text back to the right place in the source file, so getting it exactly
right (including for unterminated literals, see "Escape handling" below) is the correctness-critical part of
every scan method:

- Line/block comments reuse `@internal/utils`'s `stripCommentMarkers` directly (it already handles the
  Javadoc gutter-stripping correctly, and always starts with `//` or `/*`).
- `stripDelimited(rawText, openLen, closeLen, hasClose)` strips a fixed-length open/close delimiter pair -
  1-character quotes for a char/string literal, 3-character `"""` for a text block. `hasClose` must come
  from the scan itself (whether it actually found a real closing delimiter, vs. running off the end of the
  file) - it can't be inferred from `rawText`'s length alone, since a well-formed literal can end exactly at
  EOF.

### Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated char/string literal or text block ending mid-escape) lands on the
end of `content` instead of one past it. Every backslash-skip in `scanQuotedString`/`scanJavaTextBlock` goes
through this - without it, the emitted `range`/`map` can exceed `content.length`, inconsistent with the
actual `rawText` (this was a real bug, found by Copilot's review of `@cspell/parser-strings-comments` PR #60 -
see `parser.test.ts`'s "unterminated literals at EOF" tests).

## Javadoc detection

A `/* ... */` block comment is additionally tagged `comment.block.doc` when `rawText.startsWith('/**')` and
`rawText.length >= 5` - the length check exists so the 4-character `/**/` (an empty ordinary block comment,
`/*` immediately closed by `*/`, with no room left for a 3-character `/**` opener that still has its own
`*/` to close) isn't misread as an empty Javadoc comment. See `parser.test.ts`'s "Javadoc detection" tests,
including the boundary case `/***/` (5 characters), which _is_ a valid (empty) Javadoc comment.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`),
built as module-level constants (`COMMENT_BLOCK_DOC_TAG`, `STRING_TEXT_BLOCK_TAG`, ...) rather than computed
per segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline for the larger, more realistic cases - a fixture is real, syntactically
  valid Java content, which both exercises real file content and makes intent easier to read than an escaped
  string literal. `fixtures/` is excluded from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a
  fixture's exact bytes - quote style, spacing, an unterminated literal's missing closing delimiter - are
  frequently what's being asserted on; don't let a formatter "fix" one. Smaller, boundary-specific cases (the
  `"""` dispatch, Javadoc detection, unterminated literals at EOF) use short inline content instead, the same
  way `@cspell/parser-typescript-strings-comments/src/parser.test.ts` does for its own regex/division and
  trailing-backslash regression coverage.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in a segment the filter
  excludes). Check it both ways: run cspell with the sample's config and with `plugin.defineConfig()`, each with
  `--no-config-search`, so the sample's own config doesn't apply to both runs.
