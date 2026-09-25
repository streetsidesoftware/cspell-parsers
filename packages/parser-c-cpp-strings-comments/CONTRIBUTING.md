# Contributing to @cspell/parser-c-cpp-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

This package can also serve as a starting point for a new parser package: copy `src/parser.ts`,
`src/plugin.ts`, `src/index.ts`, and `src/recommended.ts` into a new package under `packages/` and replace the
parsing logic with your own. See the repo root `CONTRIBUTING.md`'s "Adding a new parser package" for the full
steps.

## Shape of the parser

This parser is a single hand-written scanner (`Scanner`, a small stateful class holding a mutable cursor `i`
over `content`). There's no AST and no tokenizer for the language as a whole - `Scanner.run` walks `content`
character by character, recognizing only the handful of constructs that matter (comments, string/char
literals, and C++ raw strings). Everything between them (identifiers, keywords, punctuation, numbers,
preprocessor directives) is emitted as a `code` segment. `code` is `false` in `tags`, so the default filter
built by `createPluginParserWithFilterTags` drops it, and a user can turn it back on with `customizePlugin`.

### No `emitFragment`/multi-yield helper is needed

Unlike a language with template-literal interpolation (JS/TS) or PHP's `{$...}` string interpolation, no
construct in C/C++ ever splits a single literal into multiple `ParsedText` fragments. Every scan method
(`scanLineComment`, `scanBlockComment`, `scanQuotedString`, `tryScanCppRawString`) returns exactly one
`ParsedText` (or `undefined`, for `tryScanCppRawString`'s "not actually a raw string" case), and `run()`
yields each one directly as it's found - there's no need for a separate generator-based `emitFragment` helper
the way the JS/TS and combined packages have.

### Emitting a segment

Every scan method builds a `ParsedText` from a `[start, end)` range it already knows. `ParsedText.range` is
the `[start, end]` offset of that segment in the original `content`, which is how cspell maps spelling issues
found in the parsed text back to the right place in the source file - getting this right for every construct
(including the unterminated/EOF cases below) is the core correctness concern of this scanner.

- Block comments reuse `@internal/utils`'s `stripCommentMarkers` directly (it already handles the doc-comment
  gutter-stripping correctly, and always starts with `/*`). Line comments use a local `stripLineMarker`
  instead - the same helper `@cspell/parser-csharp-strings-comments` uses - since a line comment's marker can
  be one of two lengths here (`//`, or the 3-character `///`/`//!` Doxygen doc marker), unlike
  `stripCommentMarkers`, which only ever strips a fixed 2-character `//`.
- `stripDelimited(rawText, openLen, closeLen, hasClose)` strips a fixed-length open/close delimiter pair
  (quotes, or a raw string's `R"delim(`/`)delim"`). `hasClose` must come from the scan itself (whether it
  actually found a real closing delimiter, vs. running off the end of the file) - it can't be inferred from
  `rawText`'s length alone, since a well-formed literal can end exactly at EOF.

### Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated string/char literal ending mid-escape) lands on the end of `content`
instead of one past it. Every backslash-skip in `scanQuotedString` goes through this - without it, the
emitted `range`/`map` can exceed `content.length`, inconsistent with the actual `rawText` (this was a real
bug, found by Copilot's review of `@cspell/parser-strings-comments` PR #60 before this package was split out
of it - see `parser.test.ts`'s "unterminated literals ending in a trailing lone backslash" tests). Raw strings
have no escapes at all, so `tryScanCppRawString` doesn't need this.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`),
built as module-level constants (`COMMENT_BLOCK_DOC_TAG`, `STRING_RAW_TAG`, ...) rather than computed per
segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

## C++11 raw strings (`tryScanCppRawString`)

This is the trickiest part of the scanner, and the one place C++ syntax genuinely differs from C: `R"delim(
... )delim"`, optionally preceded by an encoding prefix (`u8`, `u`, `U`, or `L`). Three things make this
non-trivial:

1. **Word-boundary check.** `isIdentChar(content[this.i - 1])` must be false (or `this.i` must be the start of
   file) before even trying to match - otherwise an ordinary identifier that happens to end in `R` (or
   `...u8R`) would falsely trigger this. There's no equivalent check needed at the _end_ of the prefix match,
   since the regex itself requires a literal `"` right after the prefix letters.
2. **Delimiter length and matching `(`.** `delim` can be 0 to 16 characters, scanned up to the first `(`; if
   17 characters pass without finding one, or EOF is hit first, this isn't a valid raw string after all and
   the function returns `undefined` so the caller falls back to treating the letters as ordinary code.
3. **Exact closer matching, not just "next quote".** The closing sequence is `)delim"` as one exact string -
   found via `content.indexOf(closer, ...)`, not by scanning for the next stray `)` or `"`. This matters
   because the raw string's whole point is to contain characters (including `)`, `"`, and even a _shorter_
   near-match of the delimiter) that would otherwise need escaping. `fixtures/raw-strings.cpp`'s
   `uR"DELIM(has a ) paren and even )DEL which isn't quite the closer)DELIM"` fixture exists specifically to
   catch a regression here: a naive scan for `)` followed by any identifier characters and a `"` would stop at
   `)DEL` (missing the "IM" suffix) instead of the real `)DELIM"` closer three characters later - `indexOf`
   with the full literal closer string can't make that mistake.

This applies unconditionally to `.c` files too, not just `.cpp` - real C code can never contain `R"..."`
syntax (C has no raw string literals), so always attempting the match is harmless there and avoids needing
any extension-based dialect detection at all.

## Digit separators (`isDigitSeparator`)

C++14 and C23 allow `'` inside a number, as in `1'000'000` or `0xFF'FF`. Read as a char literal, that `'`
would swallow the code after it up to the next `'`. A `'` is a digit separator when the next character
continues the number and the token before it starts with a digit (or `.` and a digit). A char literal's
encoding prefix (`u8'a'`, `L'a'`) starts with a letter, so it's still read as a char literal.
`fixtures/digit-separators.cpp` covers both.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid content in its own extension
  (`.c`, `.cpp`, `.hpp`), which both exercises real file content and makes intent easier to read than an
  escaped string literal. `fixtures/` is excluded from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a
  fixture's exact bytes - quote style, spacing, an unterminated literal's missing closing delimiter - are
  frequently what's being asserted on; don't let a formatter "fix" one.
- `fixtures/raw-strings.cpp` and `fixtures/unterminated-raw-string.cpp` specifically exercise
  `tryScanCppRawString`'s delimiter-matching, including the near-miss-closer case described above and an
  unterminated raw string that never finds its closer at all (falls back to running to EOF, the same as an
  unterminated block comment or quoted string).
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in a segment the filter
  excludes). Check it both ways: run cspell with the sample's config and with `plugin.defineConfig()`, each with
  `--no-config-search`, so the sample's own config doesn't apply to both runs.
