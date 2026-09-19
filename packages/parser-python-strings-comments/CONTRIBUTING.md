# Contributing to @cspell/parser-python-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

Like every other `-strings-comments` package in this repo, this is a single hand-written scanner (`Scanner`,
a small stateful class holding a mutable cursor `i` over `content`). There's no AST and no tokenizer for
Python as a whole - `Scanner.scanCode` walks `content` character by character, recognizing only comments and
string literals and silently advancing `i` past everything else (identifiers, keywords, numbers, operators).
Python was not part of any prior combined package in this repo, so this scanner was designed from the
language spec rather than split out of an existing implementation - see `@cspell/parser-typescript-strings-comments`
and `@cspell/parser-strings-comments` for the established conventions it follows.

### `scanCode`'s one exit condition

`scanCode(end, stopAtUnmatchedBrace)` is the core loop, called both at the top level (for the whole file) and
recursively for an f-string's `{...}` interpolation hole, which doesn't have a known end index up front - only
"the matching `}`". `stopAtUnmatchedBrace: true` makes `scanCode` track its own brace depth and return as soon
as it sees a `}` at depth 0, having consumed it. Because this is the exact same function used for ordinary
code, a string or comment nested inside a hole (e.g. `f"{d['key']}"`, or a format spec's own nested
replacement field, `f"{value:{width}}"`) is picked up (or, for the nested `{width}`, simply balanced past)
completely normally - there's no separate "expression" scanner to keep in sync.

### Prefix detection and its word-boundary check

`detectStringPrefix(content, i)` is the analog of
`@cspell/parser-typescript-strings-comments`'s `tryScanRegExpCallArgs` boundary check, applied to Python's
string prefixes instead of the `RegExp` identifier. Before accepting `content[i]` as the start of a prefix,
it checks `isIdentChar(content[i - 1])` - a word boundary - so a longer identifier that merely _ends_ in a
letter which happens to be a valid prefix (`r`, `u`, `f`, `b`, or one of the 2-letter combinations) is never
misread as starting one. `parser.test.ts`'s "does not mistake a prefix-like substring in the middle of a
longer identifier for a real prefix" test exercises this directly: `numbr"..."` has "br" - a valid prefix - immediately before
the quote, but "br" isn't at a word boundary (it's the tail of "numbr"), so it must be left as an ordinary,
unprefixed string.

This check only guards _prefix_ detection, not plain quotes: `scanCode` always treats a bare `'`/`"` it meets
as the start of an ordinary string, regardless of what precedes it - unlike the JS/TS family's `canPrecedeString`,
Python has no regex-literal-vs-division-style ambiguity for this scanner to resolve, so no equivalent
character-level guard is needed for un-prefixed quotes.

The 2-letter combinations (`rb`/`br`/`rf`/`fr`) are tried before the 1-letter ones (`detectStringPrefix` loops
`[2, 1]`), so a 2-letter prefix is never cut short at its first letter only to fail the "is the next character
a quote" check and be missed entirely.

### Raw strings use the same escape-skip as every other string form - deliberately

`skipEscape(content, i)` is the same `i + 2`-clamped-to-`content.length` helper the rest of this repo's
`-strings-comments` family uses, and every string body scan (`scanPlainStringBody`,
`scanInterpolatedStringBody`) calls it on every backslash, **including in `r`-prefixed strings**. This is not
a shortcut that happens to work; it's how Python's own tokenizer behaves. A raw string doesn't _interpret_
`\n`/`\t`/etc. as escape sequences - the backslash and the character after it both end up literally in the
string's value - but the backslash still "protects" whatever follows it from ending the string while the
tokenizer looks for the closing quote. That's why `r'\''` is an unterminated-string error in real Python (the
`\'` is skipped as a unit, so the tokenizer runs past the only quote in the literal looking for another one)
while `r'\\'` is valid and contains one literal backslash. So `isRaw` only ever changes which _tag_ a string
gets in this parser - never the algorithm that finds where it ends. `parser.test.ts`'s "still boundary-skips a
backslash-quote in a raw string" test (against `fixtures/raw-strings.py`'s `r"a\"b"`) is the regression
coverage for this: without the shared `skipEscape` call, the scanner would stop at the first (escaped) `"`
instead of the real closing one after `b`.

### Triple-quote detection

A string's delimiter is 3 quote characters, not 1, only when the three characters starting at the opening
quote (i.e. right after any prefix) are all the same quote character - checked with a direct peek at
`content[i]`/`content[i + 1]`/`content[i + 2]` (`isClosingDelimiterAt` reuses the same peek for finding the
_closing_ delimiter), not by scanning further ahead. This mirrors `@cspell/parser-strings-comments`'s C#
quote-run detection (`tryScanCSharpString`) and Java's `scanJavaTextBlock`, simplified to Python's fixed
3-or-1 delimiter lengths (Python has no C#-style "3 or more" raw-string quote run).

A non-triple string does not stop early at a literal newline - real Python would reject one, but keeping the
scanner's behavior consistent with every sibling package's plain quoted-string scan (which never special-cases
an embedded newline either) was judged more valuable than modeling that one syntax-error case correctly.

### f-strings: fragment splitting and brace doubling

`scanInterpolatedStringBody` mirrors `@cspell/parser-typescript-strings-comments`'s
`scanTemplateLiteral`/`emitFragment` almost exactly, with two differences: Python f-strings use bare `{`/`}`
instead of `` `${` ``/`}`, and a doubled `{{`/`}}` is a literal brace rather than the start/end of a hole - the
same doubling convention `@cspell/parser-strings-comments`'s `scanCSharpInterpolatedString` uses for C#'s
`$"..."`. Doubled braces are skipped two characters at a time (`i += 2; continue;`) without being collapsed in
the emitted fragment text - the raw doubled characters stay in the slice exactly as C#'s equivalent leaves
them, rather than being normalized to a single literal brace, since correcting that would need to rewrite the
segment's text away from a direct slice of `content` and complicate the `SourceMap`-free "as-is" fragment
emission for no real spell-checking benefit (a doubled brace isn't a word cspell would ever flag).

This applies identically to single/double-quoted and triple-quoted f-strings - `scanString` computes
`delimLen` once (1 or 3) and both `scanPlainStringBody`/`scanInterpolatedStringBody` take it as a parameter,
so the triple-vs-single distinction and the f-string-vs-plain distinction are fully orthogonal.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`string.singleQuote` also carries `string`). Unlike most sibling
packages, this one composes `string.raw`/`string.interpolated` onto a quote-style base tag via a small
`stringTags(base, isRaw, isInterpolated)` helper rather than declaring all twelve possible combinations (3
quote styles x raw x interpolated) as their own named `ParsedTags` constants - `isRaw`/`isInterpolated` are
known once per string literal (from its prefix), so this costs nothing extra per character scanned, just a
few extra object spreads per string literal found. See `README.md`'s [Tags](README.md#tags) table for what
each tag means to a consumer.

## Known limitation: no docstring detection

A "docstring" in Python is a triple-quoted string that happens to be the first statement in a module, class,
or function body - not a distinct piece of syntax. Recognizing that position would require this scanner to
track whether it's at the start of a body, which needs at least a notion of statements and indentation this
character-level scanner deliberately doesn't have (adding it would mean building most of a real Python
parser). Every triple-quoted string gets the plain `string.tripleQuote` tag, regardless of position - see
`parser.test.ts`'s "tags a triple-quoted string as string.tripleQuote without detecting it as a docstring"
test and `README.md`'s [Known limitations](README.md#known-limitations) section.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline for most cases - a fixture is real Python source, which both exercises real
  file content and makes intent easier to read than an escaped string literal. `fixtures/` is excluded from
  `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes - quote style, spacing, an
  unterminated literal's missing closing delimiter - are frequently what's being asserted on; don't let a
  formatter "fix" one. Two genuinely EOF-specific edge cases (an unterminated single-quoted string, and a
  literal ending in a trailing lone backslash) use small inline `content` strings instead, the same way
  `@cspell/parser-typescript-strings-comments`'s own trailing-backslash regression tests do - a fixture file
  can only have _one_ thing at the true end of the file, so a second "at EOF" scenario needs its own snippet.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling, `Wlecome`, inside an f-string
  fragment that `{ '*': true, 'string.interpolated': false }` excludes) - sanity-checked by temporarily
  swapping in the plain `plugin` and confirming `cspell .` actually fails without the filter before restoring
  it, the way `packages/parser-typescript/samples/customize` does.

<!-- cspell:ignore numbr Wlecome -->
