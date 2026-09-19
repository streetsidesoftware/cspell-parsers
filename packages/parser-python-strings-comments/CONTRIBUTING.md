# Contributing to @cspell/parser-python-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

Like every other `-strings-comments` package in this repo, this is a single hand-written scanner (`Scanner`)
with no AST or tokenizer - `Scanner.scanCode` walks `content` character by character, recognizing only
comments and string literals. See `@cspell/parser-typescript-strings-comments` and
`@cspell/parser-strings-comments` for the conventions this package follows.

### `scanCode`'s recursion for f-string holes

`scanCode(end, stopAtUnmatchedBrace)` is called recursively (`stopAtUnmatchedBrace: true`) to scan an
f-string's `{...}` interpolation hole, whose end isn't known up front - only "the matching `}`" (tracked via
its own brace-depth counter). Because it's the same function used for ordinary code, nested constructs
(`f"{d['key']}"`, or a format spec's own nested replacement field `f"{value:{width}}"`) are handled with no
separate expression scanner to keep in sync.

### Prefix detection and its word-boundary check

`detectStringPrefix(content, i)` requires `content[i - 1]` not be an identifier character, so a longer
identifier that merely _ends_ in a prefix-like letter (`r`, `u`, `f`, `b`, or a 2-letter combination) is never
misread as starting one - see `parser.test.ts`'s "prefix-like substring in the middle of a longer identifier"
test (`numbr"..."`: "br" is a valid prefix but isn't at a word boundary here).

This guards prefix detection only; `scanCode` treats any bare `'`/`"` it meets as an ordinary string
regardless of context - unlike the JS/TS family's `canPrecedeString`, Python has no regex-vs-division
ambiguity for this scanner to resolve.

2-letter combinations (`rb`/`br`/`rf`/`fr`) are tried before 1-letter ones (`detectStringPrefix` loops
`[2, 1]`), so a 2-letter prefix is never cut short at its first letter.

### Raw strings use the same escape-skip as every other string form - deliberately

Every string body scan calls `skipEscape` on every backslash, **including in `r`-prefixed strings**. This is
how Python's own tokenizer behaves: a raw string doesn't _interpret_ `\n`/`\t`/etc. as escapes, but the
backslash still "protects" the character after it from ending the string while the tokenizer looks for the
closing quote. That's why `r'\''` is an unterminated-string error in real Python, while `r'\\'` is valid and
contains one literal backslash - `isRaw` only ever changes which _tag_ a string gets, never the algorithm
that finds where it ends. Regression coverage: `parser.test.ts`'s "still boundary-skips a backslash-quote in
a raw string" test, against `fixtures/raw-strings.py`'s `r"a\"b"`.

### Triple-quote detection

A delimiter is 3 quote characters, not 1, only when the three characters at the opening quote position (after
any prefix) are all the same quote character - a direct peek (`isClosingDelimiterAt` reuses it for the
closing delimiter too), not a scan-ahead. Mirrors `@cspell/parser-strings-comments`'s C# quote-run detection
and Java's text-block scanning, simplified to Python's fixed 3-or-1 lengths.

A non-triple string doesn't stop early at a literal newline - real Python would reject one, but matching
every sibling package's plain-string scan was judged more valuable than modeling that one syntax-error case.

### f-strings: fragment splitting and brace doubling

Python f-strings use bare `{`/`}` rather than `` `${` ``/`}`, and a doubled `{{`/`}}` is a literal brace, not
a hole (same convention as `@cspell/parser-strings-comments`'s C# `$"..."` handling). Doubled braces are
skipped two at a time without being collapsed in the emitted fragment - normalizing them would mean rewriting
the segment away from a direct `content` slice, for no spell-checking benefit (a doubled brace isn't a word
cspell would ever flag).

`scanString` computes `delimLen` (1 or 3) once and passes it to both body scanners, so the triple-vs-single
and f-string-vs-plain distinctions are fully orthogonal.

## Tags

Same convention as every other package: a tag is a dot-separated hierarchical name, and every segment carries
its whole ancestor chain (`string.singleQuote` also carries `string`). This package composes
`string.raw`/`string.interpolated` onto a quote-style base tag via `stringTags` rather than declaring all
twelve combinations as named constants - `isRaw`/`isInterpolated` are known once per literal, so this costs a
few extra object spreads, not a per-character cost. See `README.md`'s [Tags](README.md#tags) table for what
each tag means to a consumer.

## Known limitation: no docstring detection

A "docstring" is a triple-quoted string that happens to be the first statement in a module, class, or
function body - not distinct syntax. Recognizing that position would require tracking statement/indentation
context this scanner deliberately doesn't have. Every triple-quoted string gets the plain `string.tripleQuote`
tag regardless of position - see `parser.test.ts`'s docstring test and `README.md`'s
[Known limitations](README.md#known-limitations) section.

## Testing

- `parser.test.ts` reads fixtures from `fixtures/` rather than embedding source inline for most cases - real
  Python source is easier to read than an escaped string literal. `fixtures/` is excluded from
  `tsc`/ESLint/Prettier (see root `CLAUDE.md`) since a fixture's exact bytes (quote style, spacing, a missing
  closing delimiter) are often what's being asserted on. Two EOF-specific edge cases (an unterminated
  single-quoted string, and a literal ending in a trailing lone backslash) use inline `content` strings
  instead, since a fixture file can only have one thing at the true end of the file.
- `samples/` is a real end-to-end check via `pnpm run test:cspell` (`cspell .` from the package root).
  `samples/customize` proves the `customizePlugin` tag filter does something real (a genuine misspelling,
  `Wlecome`, inside an f-string fragment excluded by `{ '*': true, 'string.interpolated': false }`) -
  sanity-checked by temporarily swapping in the plain `plugin` and confirming `cspell .` fails without the
  filter, then restoring it.

<!-- cspell:ignore numbr Wlecome -->
