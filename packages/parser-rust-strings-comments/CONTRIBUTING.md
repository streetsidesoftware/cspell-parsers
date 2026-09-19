# Contributing to @cspell/parser-rust-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

Like `@cspell/parser-go-strings-comments` and `@cspell/parser-csharp-strings-comments`, this parser is a
single hand-written scanner (`Scanner`, a small stateful class holding a mutable cursor `i` over `content`).
There's no AST and no tokenizer for the language as a whole - `Scanner.run` walks `content` character by
character, recognizing only the handful of constructs that matter (comments and strings) and silently
advancing `i` past everything else (identifiers, keywords, punctuation, numbers, lifetimes, char literals).
Since cspell only ever checks what's inside `parsedTexts`, this is how the parser excludes syntax noise: by
simply never emitting it, not by filtering it out afterwards - the same approach `@cspell/parser-example`
uses. Lifetimes and char literals are both recognized well enough to be skipped correctly (see Wrinkle 2
below for why that recognition matters even though neither is ever spell checked), but neither one ever
produces a `ParsedText` - there's no tag to filter them by, because nothing is emitted for them in the first
place.

Rust has no template-literal-style interpolation, so unlike the JS/TS-family scanner in this repo, `run()`
doesn't need a recursive `scanCode(end, stopAtUnmatchedBrace)` helper - it's a single flat loop, and every
scan method emits exactly one `ParsedText`.

### Generators, not an array

Every emitting method returns a single `ParsedText` that `run()`'s generator `yield`s, following
`@cspell/parser-typescript-strings-comments`'s pattern: `run()` is a generator, `parse()` returns
`new Scanner(content).run()` directly, never collecting into an array first - there's nothing here holding a
tree or other resource a consumer could leak by not fully draining the result.

## Wrinkle 1: block comments nest

Unlike every C-family language covered elsewhere in this repo, Rust block comments **nest**:
`/* /* nested */ still open */` is ONE comment, not two - closing at the first `*/` (as a C/C++/Java/C#/Go
scanner does) would incorrectly cut it off after "nested" and leave `still open */` behind as unparsed
code.

`scanBlockComment` tracks this with a plain depth counter, starting at 1 (for the opener it was called for):

```ts
let i = start + 2; // skip the opening "/*"
let depth = 1;
while (i < content.length && depth > 0) {
  if (content[i] === '/' && content[i + 1] === '*') {
    depth++;
    i += 2;
    continue;
  }
  if (content[i] === '*' && content[i + 1] === '/') {
    depth--;
    i += 2;
    continue;
  }
  i++;
}
```

Every further `/*` increments `depth`; every `*/` decrements it; the comment only actually closes once
`depth` returns to `0`. This applies uniformly to a plain block comment and both doc-comment block forms
(`/** ... */`, `/*! ... */`) - the doc-vs-plain classification is a separate check made afterward, against
the already-correctly-bounded `rawText`, so it doesn't interact with the nesting logic at all. If the file
ends before `depth` reaches `0` (an unterminated, possibly-nested comment), the loop simply exits because
`i >= content.length`, and the comment is extended to the end of the file exactly like an unterminated
non-nested comment elsewhere in this repo - see `fixtures/unterminated.rs`, which is deliberately an
unterminated comment _containing_ a fully-closed nested one, to prove depth still ends up at the right
non-zero value rather than accidentally reaching `0`.

Scanning starts at `start + 2` (i.e., right after the initial `/*`), which matters for the doc-comment
opener forms: for `/**` (3 characters: `/`, `*`, `*`), the loop's first character examined is the _second_
`*`, not the first - it's only ever compared as part of a two-character `/*`/`*/` window sliding forward one
character at a time (except when it matches, when it jumps by 2), so the extra `*` in a doc opener is just
scanned over like any other character and never confused for a nesting marker itself. The same reasoning
means `/*!`'s `!` is likewise just an ordinary character to the depth-tracking loop.

## Wrinkle 2: char literal vs. lifetime/label

Rust uses a bare `'` for two unrelated things:

- A **char literal** (`'a'`, `'\n'`, `'\''`, `'\u{1F600}'`) - always exactly one character or one escape
  sequence, then a closing `'`.
- A **lifetime or label** (`'a`, `'static`, `'_`, used in type/generic syntax like `&'a str` or
  `fn foo<'a>(...)`) - which has **no closing quote at all**.

Naively scanning forward from a `'` looking for the next `'` (the way `scanQuotedString` does for `"..."`)
would be wrong for a lifetime: there's nothing to find, so it would either run away consuming the rest of the
file looking for a quote that never comes, or accidentally treat some unrelated, much-later `'` (starting
another lifetime or char literal) as this one's close.

**Char literals are never spell checked** - a single character or escape sequence has no prose worth
checking - so `tryScanCharLiteral` doesn't build a `ParsedText` at all; it only needs to find where a char
literal ends, so the scanner's cursor lands in the right place afterward. Recognizing the shape still matters
even though nothing is emitted: a char literal can contain a `"` (e.g. `'"'`), which - if the opening `'`
were just treated as an ordinary character the way a lifetime's is - would leave the `"` right after it to be
misread by `scanQuotedString` as the start of a real string, consuming real code after it while looking for a
closing quote that isn't there. `fixtures/lifetimes-vs-chars.rs`'s `quote_char_then_real_string` function
exercises exactly this: a `'"'` char literal immediately followed by a genuine string, proving the string is
still recognized correctly.

`tryScanCharLiteral` makes a purely **local** decision - it only ever looks at the one or two characters
immediately after the opening `'` (or `b'`), never scanning forward speculatively:

1. If the character right after the quote is `\` (backslash): this can only be an escape-based char literal.
   Resolve the escape's exact length via `charLiteralEscapeLength` - `2` for a simple escape (`\n`, `\t`,
   `\r`, `\\`, `\'`, `\"`, `\0`), `4` for a byte escape (`\xHH`, exactly two hex digits), or the full
   `\u{H...H}` span (1-6 hex digits between braces) for a Unicode escape - then check whether the character
   immediately after it is `'`. If it is, this is a char literal - consume it (advance `this.i` past
   `literalStart` through that closing `'`, inclusive) and return `true`. If the escape isn't recognized, or
   isn't immediately followed by `'`, this wasn't a valid escape-based char literal after all - return
   `false` (consuming nothing), and the caller treats the opening `'` as an ordinary skipped character.

   This can't reuse the generic 2-character `skipEscape` (fine for a `"..."` string, which only needs to
   find _a_ boundary, not measure any one escape precisely): assuming every escape is exactly 2 characters
   long is wrong for `\xHH` (4 characters) and `\u{...}` (4-9 characters, depending on how many hex digits),
   both of which are real, common Rust syntax - not edge cases worth leaving unrecognized. `charLiteralEscapeLength`
   measures each form precisely so a multi-character escape's closing `'` is found correctly and the whole
   literal is cleanly consumed, rather than only its first two characters (leaving the rest to leak through as
   unrecognized code).

2. Else (the character right after the quote isn't `\`): check whether the character **two** positions past
   the opening `'` is `'`. If so, this is a plain one-character literal (`'a'`, `'0'`, ...) - consume it
   (exactly 3 characters: `'` + 1 char + `'`) and return `true`.

3. Otherwise, this `'` is not a char literal at all - it's a lifetime or label. **Do not** scan forward
   looking for a closing quote; there isn't one. Return `false`; `run()` then advances `this.i` by 1 (treating
   the `'` as an ordinary skipped character, exactly like any other punctuation this scanner doesn't
   recognize) and lets the normal fallthrough skip the following identifier (`a`, `static`, `_`, ...)
   character by character, with no special handling needed - lifetimes are never emitted as `ParsedText`s, by
   construction (and neither are char literals, by design).

A byte-char literal (`b'x'`, `b'\n'`) runs through the exact same three-step algorithm, just starting one
character later: `tryScanCharLiteral`'s `literalStart` parameter is the position of the `b` (not the `'`),
and it computes `quoteStart` as `literalStart + 1` when `content[literalStart] === 'b'`. There's no "byte
lifetime" to disambiguate against, so `b'` is unambiguously either a byte-char-literal start or nothing -
if it's nothing, `run()` just skips the `b` by itself and lets the next loop iteration re-examine the `'`
fresh via the plain (non-byte) case, which then applies the same three-step algorithm on its own.

`fixtures/lifetimes-vs-chars.rs` exercises both directions together - real char/byte-char literals
(`'a'`, `'\n'`, `'\''`, `'\x41'`, `'\u{1F600}'`, `b'x'`, `b'\n'`, `b'\x41'`) alongside real lifetime usages
(`Wrapper<'a>`, `&'a str`, `fn longest<'a>`, `&'static str`, `&'_ str`) - specifically so a regression in
either direction (a lifetime mis-scanned as a runaway char literal, or a real char literal left unrecognized
and its closing `"`-adjacent content leaking into a later string) shows up as a test failure.

## Doc comments

- **Line comments**: `//` is plain; `///` (exactly three slashes - a fourth or more, `////`, is a common
  "visual separator" convention and stays plain `comment.line`) or `//!` are doc comments. Both doc forms get
  the single tag `comment.line.doc` - this repo's convention is one doc tag per comment _shape_, not separate
  inner-vs-outer tags, since inner-vs-outer isn't spell-checking-relevant. See
  `@cspell/parser-c-cpp-strings-comments`'s `scanLineComment` for the same `isTripleSlash`/`isBangSlash`
  pattern (there, for Doxygen's `///`/`//!`) this was adapted from.
- **Block comments**: `/* */` is plain; `/** */` (outer, at least 5 characters so the 4-character `/**/` isn't
  misread as an empty doc comment - same length guard as every other `/**`-checking package in this repo) or
  `/*! */` (inner) are doc comments, both tagged `comment.block.doc`. Classification happens against the
  already depth-correct `rawText` (see Wrinkle 1), so a nested plain comment inside a doc block comment
  doesn't affect whether the _outer_ comment is recognized as a doc comment - see
  `fixtures/nested-comments.rs`'s `nested_doc` case.

### Stripping the `/*!` marker's text without duplicating `stripCommentMarkers`

`@internal/utils`'s `stripCommentMarkers` only special-cases a `/**` opener - both as a 3-character marker
length and for its own per-line "gutter" (leading `*`) stripping decisions across a multi-line doc comment.
It has no notion of Rust's `/*!` inner doc form. Rather than duplicating its (non-trivial) gutter-stripping
algorithm here just to teach it about one more opener spelling, `stripRustBlockComment` substitutes a `*` for
the `!` before delegating:

```ts
function stripRustBlockComment(rawText: string): { text: string; map: SourceMap } {
  const normalized = rawText.startsWith('/*!') ? '/**' + rawText.slice(3) : rawText;
  return stripCommentMarkers(normalized);
}
```

This is safe because `/*!` and `/**` are the same length, and `stripCommentMarkers`'s extracted `text` never
includes the character it inspects for the `/**`-or-not decision (character index 2) - the returned `text`
always starts at or after the 3-character open marker. Swapping that one character is invisible in the
result; only `stripCommentMarkers`'s own internal "is this the doc opener" check ever sees it.

## Raw strings: `#`-count delimiter matching

Rust raw strings (`r"..."`, `r#"..."#`, `r##"..."##`, ...) and byte raw strings (`br"..."`, `br#"..."#`, ...)
use zero-or-more `#` characters between the `r` and the opening `"`, closed by a `"` followed by **exactly**
that many `#` characters. No escape processing happens inside at all - a backslash is a literal character,
never an escape.

This is structurally the closest thing in this repo to C++'s `R"delim(...)delim"` raw string
(`@cspell/parser-c-cpp-strings-comments`'s `tryScanCppRawString`), which also has to find a _computed_
closing token rather than a fixed one - but where C++'s delimiter is arbitrary _text_ (0-16 characters,
copied verbatim out of the source, up to the next `(`), Rust's is a _count_. `tryScanRawString` adapts the
same "build the exact closing token, then search for it with `indexOf`" approach, just building the token
from a repeated `#` instead of copied text:

```ts
let hashCount = 0;
while (content[j] === '#') {
  hashCount++;
  j++;
}
// ...
const closer = '"' + '#'.repeat(hashCount);
const closeIndex = content.indexOf(closer, bodyStart);
```

Searching for the _exact_ closing token (not just the next `"`) is what makes `fixtures/raw-strings.rs`'s
`double_hashed` case work: the body contains a `"#` (one hash) partway through, but since the required closer
for a `##`-delimited raw string is `"##` (two hashes), `indexOf` correctly skips right past that shorter,
non-matching run and finds the real 2-hash closer later on.

### The `r`/`b`/`br` prefix's word-boundary guard

`tryScanRawString` requires a non-identifier character (or start of file) immediately before the `b`/`r`
prefix - `isIdentChar(content[start - 1])` - mirroring
`@cspell/parser-typescript-strings-comments`'s `tryScanRegExpCallArgs` boundary check. Without it, an ordinary
identifier that happens to end in "r" or "b" immediately before an unrelated quote, with no separator between
them (e.g. the trailing `r` of an identifier called `author` right before a string, as in `author"data"`), would
be read as a raw-string prefix rather than the last letter of that identifier. `run()` applies the same
reasoning to the plain `b"..."` byte-string and `b'...'` byte-char forms, via an inline
`!isIdentChar(content[this.i - 1])` check at each call site, for the same reason.

## Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated string ending mid-escape) lands on the end of `content` instead of
one past it. Every backslash-skip in `scanQuotedString`/`tryScanCharLiteral` goes through this - without it,
the emitted `range`/`map` can exceed `content.length`, inconsistent with the actual `rawText`. See
`parser.test.ts`'s "unterminated literals ending mid-token at EOF" tests. Raw strings never call this at all

- a backslash inside one is just a literal character, per Rust's grammar.

## Known limitations (see also README.md)

- **C-string literals (`c"..."`, `cr"..."#`, Rust 1.77+) are not implemented.** They're a natural, low-risk
  extension of `tryScanRawString`'s machinery (a `c`/`cr` prefix alongside today's bare/`r`/`b`/`br` ones), but
  were left out of this first version to keep scope tight. If you add them, extend
  `fixtures/raw-strings.rs` and `parser.test.ts` alongside `tryScanRawString`.
- The char-literal-vs-lifetime algorithm is intentionally local/non-speculative (see Wrinkle 2 above) - this
  is a deliberate scope limit, not an oversight to fix later.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`),
built as module-level constants (`COMMENT_BLOCK_DOC_TAG`, `STRING_RAW_TAG`, ...) rather than computed per
segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid Rust content, which both exercises
  real file content and makes intent easier to read than an escaped string literal. `fixtures/` is excluded
  from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes - quote style, spacing, an
  unterminated literal's missing closing delimiter - are frequently what's being asserted on; don't let a
  formatter "fix" one.
- `fixtures/nested-comments.rs` and `fixtures/unterminated.rs` specifically exercise Wrinkle 1 (nesting depth,
  including through an unterminated comment).
- `fixtures/lifetimes-vs-chars.rs` specifically exercises Wrinkle 2, in both directions, in the same file.
- `fixtures/raw-strings.rs` covers the `#`-count delimiter matching, including a body containing a shorter,
  non-matching `#`-run that must not close a longer-delimited raw string early.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in a segment the filter
  excludes) - sanity-checked by temporarily swapping in the plain `plugin` and confirming `cspell .` actually
  fails without the filter before restoring it, the way `packages/parser-typescript/samples/customize` does.

If you change either wrinkle's logic, verify your test actually catches a regression: temporarily break it
(e.g. remove the depth tracking, or make `tryScanCharLiteral` scan forward instead of checking locally),
confirm the relevant test fails, then restore the fix.
