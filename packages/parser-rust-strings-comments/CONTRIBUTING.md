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
uses. Char literals (`'a'`, `b'x'`, ...) and lifetimes/labels (`'a`, `'static`, `'_`, ...) get **no special
handling at all** - a bare `'` is simply left as ordinary, unrecognized code, exactly like any other
punctuation this scanner doesn't check. This is a deliberate simplification: char literals have no prose
worth spell checking, so there's no need to parse their shape just to decide not to emit them. See "Known
limitations" below for the one real trade-off this makes.

Rust has no template-literal-style interpolation, so unlike the JS/TS-family scanner in this repo, `run()`
doesn't need a recursive `scanCode(end, stopAtUnmatchedBrace)` helper - it's a single flat loop, and every
scan method emits exactly one `ParsedText`.

### Generators, not an array

Every emitting method returns a single `ParsedText` that `run()`'s generator `yield`s, following
`@cspell/parser-typescript-strings-comments`'s pattern: `run()` is a generator, `parse()` returns
`new Scanner(content).run()` directly, never collecting into an array first - there's nothing here holding a
tree or other resource a consumer could leak by not fully draining the result.

## Block comments nest

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

## Char literals and lifetimes: no special handling at all

Rust uses a bare `'` for two unrelated things - a **char literal** (`'a'`, `'\n'`, `'\u{1F600}'`, always
exactly one character or escape sequence then a closing `'`) and a **lifetime or label** (`'a`, `'static`,
`'_`, used in type/generic syntax like `&'a str` or `fn foo<'a>(...)`, which has **no closing quote at all**).
An earlier version of this parser disambiguated between the two with a small lookahead algorithm
(`tryScanCharLiteral`), so a char literal could be recognized and silently consumed (never emitted - see
above) without a naive forward scan misreading a lifetime as an unterminated char literal.

That disambiguation logic has been removed entirely, by design: since char literals are never spell checked
anyway, there's nothing to gain from correctly recognizing their shape - a bare `'` (whether it starts a
char literal or a lifetime) is now just left as ordinary, unrecognized code, and `run()` advances past it one
character at a time like any other punctuation.

**The trade-off**: without that recognition, a char literal containing a `"` (e.g. `'"'`) is no longer
consumed as one unit, so the `"` right after its opening `'` looks exactly like the start of a real string to
`scanQuotedString` - which then scans past the literal's actual closing `'` looking for another `"`,
potentially swallowing real code (including a genuine string) in between. This is accepted as a rare,
documented limitation (see `README.md`'s "Known limitations") rather than a reason to keep the disambiguation
logic around. `fixtures/lifetimes-vs-chars.rs`'s `quote_char_then_real_string` function and its corresponding
"KNOWN LIMITATION" test in `parser.test.ts` lock in this exact trade-off, so it stays visible and intentional
rather than turning into a silent, unexplained regression.

`fixtures/lifetimes-vs-chars.rs` still exercises the ordinary case in both directions - real char/byte-char
literals (`'a'`, `'\n'`, `'\''`, `'\x41'`, `'\u{1F600}'`, `b'x'`, `b'\n'`, `b'\x41'`) and real lifetime usages
(`Wrapper<'a>`, `&'a str`, `fn longest<'a>`, `&'static str`, `&'_ str`) - confirming neither one is ever
emitted, alongside a real string on the same line as a lifetime to confirm that's still recognized normally.

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
  already depth-correct `rawText` (see "Block comments nest" above), so a nested plain comment inside a doc block comment
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
one past it. Every backslash-skip in `scanQuotedString` goes through this - without it, the emitted
`range`/`map` can exceed `content.length`, inconsistent with the actual `rawText`. See `parser.test.ts`'s
"unterminated literals ending mid-token at EOF" tests. Raw strings never call this at all - a backslash
inside one is just a literal character, per Rust's grammar.

## Known limitations (see also README.md)

- **C-string literals (`c"..."`, `cr"..."#`, Rust 1.77+) are not implemented.** They're a natural, low-risk
  extension of `tryScanRawString`'s machinery (a `c`/`cr` prefix alongside today's bare/`r`/`b`/`br` ones), but
  were left out of this first version to keep scope tight. If you add them, extend
  `fixtures/raw-strings.rs` and `parser.test.ts` alongside `tryScanRawString`.
- **Char literals and lifetimes get no special recognition at all** (see "Char literals and lifetimes: no
  special handling at all" above) - a deliberate simplification, not an oversight. The one accepted
  consequence: a char literal containing a `"` (e.g. `'"'`) can cause a real string right after it to be
  misread, since nothing consumes the char literal as a single unit anymore.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`),
built as module-level constants (`COMMENT_BLOCK_DOC_TAG`, `STRING_RAW_TAG`, ...) rather than computed per
segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

String tags are a deliberate departure from the `string.singleQuote`/`string.doubleQuote` pattern used by
every other package in this repo: since Rust only ever uses `"` for strings (`'` is exclusively char
literals, never emitted - see above), quote style carries no information worth tagging. Instead the tags
describe the string's _kind_: `scanQuotedString` picks `STRING_TAG` (plain) or `STRING_BINARY_TAG` (byte,
`b"..."`) based on whether it was called for a `b`-prefixed literal; `tryScanRawString` picks `STRING_RAW_TAG`
or `STRING_BINARY_RAW_TAG` the same way. `STRING_BINARY_RAW_TAG` is built by spreading `STRING_BINARY_TAG`
(not `STRING_TAG` directly), so it carries `string.binary` as an ancestor alongside `string` - filtering on
`string.binary` alone therefore matches both a plain byte string and a byte raw string, the same hierarchical
filtering `customizePlugin` already relies on everywhere else. If C-string literals (`c"..."`, `cr"..."#`)
are ever added (see "Known limitations"), follow the same pattern: `string.c` and `string.c.raw`.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid Rust content, which both exercises
  real file content and makes intent easier to read than an escaped string literal. `fixtures/` is excluded
  from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes - quote style, spacing, an
  unterminated literal's missing closing delimiter - are frequently what's being asserted on; don't let a
  formatter "fix" one.
- `fixtures/nested-comments.rs` and `fixtures/unterminated.rs` specifically exercise block-comment nesting
  depth, including through an unterminated comment.
- `fixtures/lifetimes-vs-chars.rs` covers char literals and lifetimes never being emitted, in both
  directions, in the same file - including the accepted `'"'` known-limitation case.
- `fixtures/raw-strings.rs` covers the `#`-count delimiter matching, including a body containing a shorter,
  non-matching `#`-run that must not close a longer-delimited raw string early.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in a segment the filter
  excludes) - sanity-checked by temporarily swapping in the plain `plugin` and confirming `cspell .` actually
  fails without the filter before restoring it, the way `packages/parser-typescript/samples/customize` does.

If you change the block-comment nesting logic, verify your test actually catches a regression: temporarily
remove the depth tracking, confirm the relevant test fails, then restore the fix.
