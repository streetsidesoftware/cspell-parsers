# Contributing to @cspell/parser-csharp-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

This parser is a single hand-written scanner (`Scanner`, a small stateful class holding a mutable cursor `i`
over `content`). There's no AST and no tokenizer for the language as a whole - `Scanner.scanCode` walks
`content` character by character, recognizing only the handful of constructs that matter (comments and
strings). Everything between them (identifiers, keywords, punctuation, numbers) is emitted as a `code` segment.
`code` is `false` in `tags`, so the default filter built by `createPluginParserWithFilterTags` drops it, and a
user can turn it back on with `customizePlugin`.

### `scanCode`'s one exit condition

`scanCode(end, stopAtUnmatchedBrace)` is the core loop, called both at the top level (for the whole file) and
recursively for an interpolated string's `{...}` hole, which doesn't have a known end index up front - only
"the matching `}`". `stopAtUnmatchedBrace: true` makes `scanCode` track its own brace depth and return as
soon as it sees a `}` at depth 0, having consumed it. Because this is the exact same function used for
ordinary code, a string or comment nested inside the hole (e.g. a ternary's string branches, or even a line
comment on its own line inside the hole) is picked up and tagged completely normally - there's no separate
"expression" scanner to keep in sync.

### Generators, not an array

Every emitting method is a generator (or returns a single `ParsedText` that a generator caller `yield`s),
following `@cspell/parser-typescript-strings-comments`'s pattern exactly: `run()` is a generator, `scanCode`
`yield`s from single-emit helpers (`scanLineComment`, `scanBlockComment`, `scanQuotedString`,
`scanCSharpVerbatimString`, `scanCSharpRawString`) and `yield*`s into multi-emit ones
(`tryScanCSharpString`, which itself dispatches into `scanCSharpInterpolatedString`). `parse()` returns
`new Scanner(content).run()` directly, never collecting into an array first - there's nothing here holding a
tree or other resource a consumer could leak by not fully draining the result.

### C#'s string literal family

`tryScanCSharpString` is the dispatcher for everything that can start with `@` or `$`:

- `@"..."` - `scanCSharpVerbatimString`. Doubled `""` is an escaped quote; there are no backslash escapes at
  all, so a lone `\` is just an ordinary character.
- `$"..."` - `scanCSharpInterpolatedString(start, verbatim: false)`. Ordinary backslash escapes apply, and
  the string is split into fragments around `{...}` holes exactly the way
  `@cspell/parser-typescript-strings-comments`'s `scanTemplateLiteral` splits a template literal around
  `${...}` - `{{`/`}}` are literal braces, not holes.
- `$@"..."` / `@$"..."` - both prefix orderings are legal C# and handled identically:
  `scanCSharpInterpolatedString(start, verbatim: true)`. Still splits on `{...}` holes, but uses the
  verbatim string's doubled-`""` escaping instead of backslash escapes.
- A run of 3-or-more `"` (optionally preceded by `@`/`$`/`$@`/`@$`) - the C# 11 "raw string literal",
  `scanCSharpRawString`. Closed by a run of **at least** as many quotes as opened it (not necessarily the
  same length), so a shorter run of quotes inside the body (e.g. `"""` inside a `""""`-delimited literal)
  never ends it early.

A bare `@identifier` (C#'s syntax for using a keyword as an identifier, e.g. `var @class = ...`) is not a
string at all: `tryScanCSharpString` returns `false` without consuming anything once it sees the character
after the prefix isn't a `"`, and `scanCode` falls through to treating `@` as an ordinary skipped character.

### The raw string literal's documented simplifications

`scanCSharpRawString`'s doc comment calls out two deliberate scope limits, both kept from the combined
`@cspell/parser-strings-comments` package this was split from:

- It does not strip the common leading indentation a raw string literal conventionally shares with its
  closing delimiter - the emitted `text` keeps every line's original indentation exactly as written.
- Unlike `scanCSharpInterpolatedString`, an interpolated raw string literal's `{...}` holes are **not** split
  out into their own recursive `scanCode` call - the whole body, including any `{...}` holes, is emitted as
  one segment.

Both only affect formatting/identifier-checking of an already-rare form, not whether the literal's own
boundaries (open/close delimiter matching) are found correctly, so this is a reasonable, documented scope
limit rather than a bug. See `fixtures/raw-strings.cs` and its coverage in `parser.test.ts` for what is and
isn't split out.

### The `///` vs `////` doc-comment boundary

`scanLineComment` tags a line comment `comment.line.doc` only when it's _exactly_ three slashes -
`content[start + 2] === '/' && content[start + 3] !== '/'`. A fourth slash (`////`, a common "visual
separator" convention in C#) is deliberately excluded: it's still tagged `comment.line`, just not
`comment.line.doc`. The marker length stripped by `stripLineMarker` is always computed from `isTripleSlash`
alone (`3` vs `2`), so a `////` line still only has its leading `//` stripped, leaving the extra `//` as part
of the checked text - see `parser.test.ts`'s "doc-comment boundary" tests, which fail if the fourth-slash
check is removed.

### Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated string ending mid-escape) lands on the end of `content` instead of
one past it. Every backslash-skip in `scanQuotedString`/`scanCSharpInterpolatedString` (when not verbatim)
goes through this - without it, the emitted `range`/`map` can exceed `content.length`, inconsistent with the
actual `rawText`. See `parser.test.ts`'s "unterminated literals ending in a trailing lone backslash" tests.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.line.doc` also carries `comment.line` and `comment`),
built as module-level constants (`COMMENT_LINE_DOC_TAG`, `STRING_RAW_INTERPOLATED_TAG`, ...) rather than
computed per segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid C# content, which both exercises
  real file content and makes intent easier to read than an escaped string literal. `fixtures/` is excluded
  from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes - quote style, spacing, an
  unterminated literal's missing closing delimiter - are frequently what's being asserted on; don't let a
  formatter "fix" one.
- `fixtures/interpolation-holes.cs` specifically exercises recursion into a `{...}` hole (a nested ternary's
  string branches, and a line comment placed on its own line inside a hole).
- `fixtures/raw-strings.cs` and `fixtures/verbatim-interpolated.cs` cover the trickiest forms: a raw string
  literal with a longer quote-run delimiter (tolerating a too-short quote run inside its body), an
  interpolated raw string (hole kept inline, not split out), and both `$@`/`@$` prefix orderings.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in a segment the filter
  excludes). Check it both ways: run cspell with the sample's config and with `plugin.defineConfig()`, each with
  `--no-config-search`, so the sample's own config doesn't apply to both runs.
