# Contributing to @cspell/parser-go-strings-comments

This is a contributor-facing walkthrough of how `src/parsers.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parsers.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

This parser is a single hand-written scanner (`Scanner`, a small stateful class holding a mutable cursor `i`
over `content`). There's no AST and no tokenizer for the language as a whole - `Scanner.scanTagged` walks
`content` character by character, recognizing only the handful of constructs that matter (comments and
strings). The `run` method wraps it with `createCodeTagsEmitter`, which emits everything between them
(identifiers, keywords, punctuation, numbers) as a `code` segment. `code` is `false` in `tags`, so the default
filter built by `createPluginParserWithFilterTags` drops it, and a user can turn it back on with
`customizePlugin`.

### `scanTagged`'s single loop

Unlike the JS/TS-family scanner (which recurses into `${...}` interpolation holes) or the combined package's
`scanCode` (which also has to stop at PHP's `?>`), Go has no interpolation and no code/markup mode switch, so
`scanTagged` is a single flat loop with no recursion and no "stop early" exit condition at all - it just walks to the
end of `content` once.

### Emitting a segment

Every scan method (`scanLineComment`, `scanBlockComment`, `scanQuotedString`, `scanGoRawString`) returns
exactly one `ParsedText` built from a `[start, end)` range it already knows, and `scanTagged` `yield`s it directly -
no construct in Go ever splits into multiple fragments (there's no template-literal-style interpolation), so
there's no `emitFragment`-style helper and no need for any scan method itself to be a generator.

- Line/block comments reuse `@internal/utils`'s `stripCommentMarkers` directly (it already handles the
  doc-comment gutter-stripping correctly, and always starts with `//` or `/*`).
- `stripDelimited(rawText, openLen, closeLen, hasClose)` strips a fixed-length open/close delimiter pair
  (quotes or backticks). `hasClose` must come from the scan itself (whether it actually found a real closing
  delimiter, vs. running off the end of the file) - it can't be inferred from `rawText`'s length alone, since
  a well-formed literal can end exactly at EOF.

### Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated rune/string literal ending mid-escape) lands on the end of `content`
instead of one past it. Every backslash-skip in `scanQuotedString` goes through this - without it, the
emitted `range`/`map` can exceed `content.length`, inconsistent with the actual `rawText` (this was a real bug
in the combined package, found by Copilot's review of `@cspell/parser-strings-comments` PR #60 - see
`parsers.test.ts`'s "unterminated literals ending in a trailing lone backslash" tests).

`scanGoRawString` deliberately does **not** call `skipEscape` at all - a raw string never processes
backslashes as escapes, so a backslash right before the closing backtick must not "swallow" it. See
`fixtures/raw-string-no-escapes.go` and its test: it proves the raw string closes exactly at the first
backtick after its opening one, even when the character immediately before that backtick is a backslash.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`),
built as module-level constants (`COMMENT_BLOCK_DOC_TAG`, `STRING_RAW_TAG`, ...) rather than computed per
segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

Two things Go's grammar simplifies relative to the combined package's other dialects:

- **No `comment.line.doc` tag.** C#'s `///` gets its own doc-comment line-tag in the combined package, but
  Go's godoc convention is just an ordinary `//` comment immediately preceding a declaration, with no special
  marker - there's nothing in the comment's own text that distinguishes it, so this package doesn't emit a
  `comment.line.doc` tag at all.
- **`comment.block.doc` is kept for shape-consistency with the other packages, even though it will
  essentially never fire.** Idiomatic Go (and `gofmt`) essentially never writes a `/** ... */` block comment -
  the `isDoc` check (`rawText.startsWith('/**')`) is identical to `@cspell/parser-typescript-strings-comments`'s
  purely so the shared `stripCommentMarkers`/tagging shape doesn't need a special case, not because real Go
  code is expected to hit it.

## Why this is simpler than the JS/TS-family scanner

This package has no equivalent of `@cspell/parser-typescript-strings-comments`'s regex-vs-division ambiguity,
no module-specifier detection, and no template-literal interpolation:

- **No regex literals.** Go has no `/pattern/` syntax at all (`regexp.MustCompile("pattern")` takes an
  ordinary string), so there's no `/` ambiguity to resolve and no `isDivisionContext`/`canPrecedeString`/
  `sawSlash` machinery needed.
- **No interpolation in any string form.** A rune literal, an interpreted string, and a raw string are each
  scanned start-to-close in one pass with no recursive call back into `scanTagged` - unlike a JS/TS template literal
  or a C# interpolated string, which both have to stop scanning at each `{`/`${` hole, recurse, and resume.
- **The raw string's closing delimiter is unambiguous.** Go's grammar disallows a literal backtick inside a
  raw string entirely, so `scanGoRawString` can just find the next backtick with `indexOf` - no escape
  handling, no nested-delimiter tracking, unlike the combined package's C++ raw string (a caller-chosen
  `delim` between `R"` and `(`) or C#'s raw string literal (a variable-length run of `"` characters).

## Testing

- `parsers.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically plausible Go content, which both
  exercises real file content and makes intent easier to read than an escaped string literal. `fixtures/` is
  excluded from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes - quote style,
  spacing, an unterminated literal's missing closing delimiter - are frequently what's being asserted on;
  don't let a formatter "fix" one. The one exception is the trailing-lone-backslash-at-EOF regression case,
  which is embedded inline in the test itself (matching
  `@cspell/parser-typescript-strings-comments`'s convention) since the test needs precise control over the
  file's very last character.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in a segment the filter
  excludes). Check it both ways: run cspell with the sample's config and with `plugin.defineConfig()`, each with
  `--no-config-search`, so the sample's own config doesn't apply to both runs.

## Using this package as a template

To start a new parser package, copy `src/parsers.ts`, `src/plugin.ts`, `src/index.ts`, and `src/recommended.ts`
into a new package under `packages/` and replace the parsing logic with your own. See the repo root
`CONTRIBUTING.md` for the full steps.

<!-- cspell:ignore godoc gofmt -->
