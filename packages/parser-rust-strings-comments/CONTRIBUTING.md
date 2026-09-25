# Contributing to @cspell/parser-rust-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

This parser is a single hand-written scanner (`Scanner`, a small stateful class holding a mutable cursor `i`
over `content`). There's no AST and no tokenizer for the language as a whole - `Scanner.scanTagged` walks
`content` character by character, recognizing only the handful of constructs that matter (comments and
strings). The `run` method wraps it with `createCodeTagsEmitter`, which emits everything between them as a
`code` segment. `code` is `false` in `tags`, so the default filter built by `createPluginParserWithFilterTags`
drops it, and a user can turn it back on with `customizePlugin`. Char literals and lifetimes get no special
handling at all - see "Char literals and lifetimes" below.

Rust has no template-literal-style interpolation, so unlike the JS/TS-family scanner in this repo, `scanTagged()`
doesn't need a recursive `scanCode(end, stopAtUnmatchedBrace)` helper - it's a single flat loop, and every
scan method emits exactly one `ParsedText`.

### Generators, not an array

Every emitting method returns a single `ParsedText` that `scanTagged()`'s generator `yield`s, following
`@cspell/parser-typescript-strings-comments`'s pattern: `scanTagged()` is a generator, `parse()` returns
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

Every further `/*` increments `depth`; every `*/` decrements it; the comment only closes once `depth` returns
to `0`. This applies uniformly to a plain block comment and both doc-comment forms (`/** ... */`,
`/*! ... */`) - the doc-vs-plain classification runs afterward, against the already-bounded `rawText`, so it
never interacts with the nesting logic. An unterminated comment (`depth` never reaches `0`) just runs to
`content.length` like a non-nested one - see `fixtures/unterminated.rs`, an unterminated comment
_containing_ a fully-closed nested one, to prove depth doesn't accidentally land on `0`.

Scanning starts right after the initial `/*`, so for a doc opener like `/**` the loop's first character seen
is the second `*` - just an ordinary character in the `/*`/`*/` two-character sliding window, never confused
for a nesting marker. Same reasoning covers `/*!`'s `!`.

## Char literals and lifetimes

Rust uses a bare `'` for two unrelated things: a **char literal** (`'a'`, `'\n'`, `'\u{1F600}'` - always one
character or escape sequence then a closing `'`) and a **lifetime/label** (`'a`, `'static`, `'_`, as in
`&'a str` or `fn foo<'a>(...)`), which has **no closing quote at all**. An earlier version of this parser
disambiguated the two with a lookahead algorithm (`tryScanCharLiteral`); that's been removed by design -
since char literals are never spell checked, there's nothing to gain from parsing their shape, so a bare `'`
(char literal or lifetime) is now just ordinary, unrecognized code.

**The exception: a char literal containing a `"`, unescaped (`'"'`) or redundantly escaped (`'\"'` - legal
per Rust's grammar, just non-idiomatic).** Left unrecognized, that embedded `"` looks exactly like the start
of a real string to `scanQuotedString`, which then scans past the literal's actual closing `'` looking for
another `"` - potentially swallowing real code, including a genuine string, in between. Both shapes are
unambiguous with one or two characters of lookahead (a lifetime never continues with `"` or `\`), so `scanTagged()`
special-cases them: it consumes `'"'` as 3 characters and `'\"'` as 4, without reintroducing a general
char-literal parser. `fixtures/lifetimes-vs-chars.rs`'s `quote_char_then_real_string` and
`escaped_quote_char_then_real_string` functions, and their tests in `parser.test.ts`, prove a real string
right after either form is still recognized correctly. (An earlier version of this parser only handled the
unescaped form, which mis-scanned the escaped one as a runaway string - the two tests above are the
regression coverage for that.)

The same fixture also covers the ordinary case in both directions - real char/byte-char literals and real
lifetime usages - confirming neither is ever emitted, alongside a real string on the same line as a lifetime
to confirm that's still recognized normally.

## Doc comments

- **Line comments**: `//` is plain; `///` (exactly three slashes - `////` or more stays plain `comment.line`,
  a common "visual separator" convention) or `//!` are doc comments, both tagged `comment.line.doc` (one doc
  tag per comment _shape_, not separate inner/outer tags, since that split isn't spell-checking-relevant).
  Adapted from `@cspell/parser-c-cpp-strings-comments`'s `isTripleSlash`/`isBangSlash` pattern for Doxygen.
- **Block comments**: `/* */` is plain; `/** */` (outer, at least 5 characters so `/**/` isn't misread as an
  empty doc comment) or `/*! */` (inner) are doc comments, both tagged `comment.block.doc`. Classification
  runs against the already depth-correct `rawText` (see "Block comments nest" above), so a nested plain
  comment inside a doc block doesn't affect the _outer_ comment's classification - see
  `fixtures/nested-comments.rs`'s `nested_doc` case.

### Stripping `/*!` without duplicating `stripCommentMarkers`

`@internal/utils`'s `stripCommentMarkers` only knows the `/**` opener, not Rust's `/*!`. `/*!` and `/**` are
the same length, and `stripCommentMarkers` never includes the character it inspects for that check in its
extracted `text` - so `stripRustBlockComment` swaps `!` for `*` before delegating, rather than duplicating
its gutter-stripping logic:

```ts
function stripRustBlockComment(rawText: string): { text: string; map: SourceMap } {
  const normalized = rawText.startsWith('/*!') ? '/**' + rawText.slice(3) : rawText;
  return stripCommentMarkers(normalized);
}
```

## Raw strings: `#`-count delimiter matching

Rust raw strings (`r"..."`, `r#"..."#`, `r##"..."##`, ...) and byte raw strings (`br"..."`, ...) use
zero-or-more `#` between the `r` and the opening `"`, closed by a `"` plus **exactly** that many `#`. No
escape processing inside - a backslash is a literal character.

Structurally the closest thing in this repo to C++'s `R"delim(...)delim"` raw string
(`@cspell/parser-c-cpp-strings-comments`'s `tryScanCppRawString`), which also needs a _computed_ closing
token - but where C++'s delimiter is arbitrary text, Rust's is a count. `tryScanRawString` builds the exact
closing token and searches for it with `indexOf`:

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

This is what makes `fixtures/raw-strings.rs`'s `double_hashed` case work: the body contains a `"#`
(one-hash) partway through, but the exact-token search skips right past it and finds the real `"##` closer.

### The prefix's word-boundary guard

`tryScanRawString` requires a non-identifier character (or start of file) immediately before the `b`/`c`/`r`
prefix (mirroring `@cspell/parser-typescript-strings-comments`'s `tryScanRegExpCallArgs`), so an identifier
ending in "r"/"b"/"c" right before an unrelated quote (`author"data"`) isn't misread as a raw-string prefix.
`scanTagged()` applies the same guard inline for the plain `b"..."`/`c"..."` forms.

## Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated string ending mid-escape) lands on the end of `content` instead of
one past it. Every backslash-skip in `scanQuotedString` goes through this - without it, the emitted
`range`/`map` can exceed `content.length`, inconsistent with the actual `rawText`. See `parser.test.ts`'s
"unterminated literals ending mid-token at EOF" tests. Raw strings never call this at all - a backslash
inside one is just a literal character, per Rust's grammar.

## Known limitations (see also README.md)

See "Char literals and lifetimes" above - the one deliberate scope limit.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`),
built as module-level constants (`COMMENT_BLOCK_DOC_TAG`, `STRING_RAW_TAG`, ...) rather than computed per
segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

String tags describe the string's _kind_ rather than quote style (Rust has only one string quote). The raw
and byte-raw/C-raw tags are built by spreading their non-raw counterpart (`STRING_BYTE_RAW_TAG` spreads
`STRING_BYTE_TAG`, not `STRING_TAG`), so filtering on `string.byte` (or `string.c`) alone matches both the
plain and raw forms.

### Why `customizePlugin`/`createParser` filter in the parser, not via cspell

`customizePlugin` and `createParser` are thin wrappers around `@internal/utils`'s `customizePluginEx` and
`customizeParserEx` (`packages/internal-utils/src/pluginEx.ts`). `createPluginParserWithFilterTags`
(`parserEx.ts`) builds the default filter from `tags`. Every filter, a consumer's included, is compiled
against the parser's unfiltered output and its `tags`, never on top of an earlier filter. The filtering
happens inside the parser before cspell sees the result, so it works with any cspell version, including one
too old to filter `ParsedText.tags` itself. See the plugin-customization ADRs
(`docs/ADRs/plugin-customization/0006-tag-filtering.md`) for the design.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline. `fixtures/` is excluded from `tsc`/ESLint/Prettier since a fixture's exact
  bytes are often what's being asserted on; don't let a formatter "fix" one.
- `fixtures/nested-comments.rs` and `fixtures/unterminated.rs` exercise block-comment nesting depth,
  including through an unterminated comment.
- `fixtures/lifetimes-vs-chars.rs` covers char literals and lifetimes never being emitted, including both the
  `'"'` and `'\"'` special cases, proving a real string right after either is still recognized correctly.
- `fixtures/raw-strings.rs` covers the `#`-count delimiter matching, including a body containing a shorter,
  non-matching `#`-run that must not close a longer-delimited raw string early, plus a `cr#"..."#` C raw
  string.
- `samples/` is a real end-to-end check: actual cspell configs plus real source files, run by
  `pnpm run test:cspell`. `samples/customize` proves the `customizePlugin` tag filter does something real (a
  genuine misspelling in a segment the filter excludes). Check it both ways: run cspell with the sample's config
  and with `plugin.defineConfig()`, each with `--no-config-search`, so the sample's own config doesn't apply to
  both runs.

If you change the block-comment nesting logic or the char-literal special case, verify your test actually
catches a regression: temporarily break it, confirm the relevant test fails, then restore the fix.
