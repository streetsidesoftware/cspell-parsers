# Contributing to @cspell/parser-typescript-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

Unlike `@cspell/parser-typescript` (a real tree-sitter grammar), this parser is a single hand-written scanner
(`Scanner`, a small stateful class holding a mutable cursor `i` over `content`). There's no AST and no
tokenizer for the language as a whole - `Scanner.scanCode` walks `content` character by character,
recognizing only the handful of constructs that matter (comments and strings) and silently advancing `i` past
everything else (identifiers, keywords, punctuation, numbers, JSX markup). Since cspell only ever checks
what's inside `parsedTexts`, this is how the parser excludes syntax noise: by simply never emitting it, not
by filtering it out afterwards - the same approach `@cspell/parser-example` uses.

This package started as the JS/TS-family slice of `@cspell/parser-strings-comments`, a single scanner that
also covered C, C++, C#, Go, Java, and PHP. Splitting each language family into its own package removes the
`Dialect` branching that combined scanner needed everywhere (`if (dialect === 'php') ...`, `if (dialect ===
'csharp') ...`) - since this package only ever handles one syntax family, `scanCode` has no dialect checks at
all, which is most of why it's about half the size.

### `scanCode`'s one exit condition

`scanCode(end, stopAtUnmatchedBrace)` is the core loop, called both at the top level (for the whole file) and
recursively for a template literal's `${...}` interpolation hole, which doesn't have a known end index up
front - only "the matching `}`". `stopAtUnmatchedBrace: true` makes `scanCode` track its own brace depth and
return as soon as it sees a `}` at depth 0, having consumed it. Because this is the exact same function used
for ordinary code, a string or comment nested inside the hole (e.g. `` `${a ? 'x' : 'y'}` ``) is picked up and
tagged completely normally - there's no separate "expression" scanner to keep in sync.

### Emitting a segment

Every `out.push(...)` site builds a `ParsedText` from a `[start, end)` range it already knows:

- Line/block comments reuse `@internal/utils`'s `stripCommentMarkers` directly (it already handles the
  doc-comment gutter-stripping correctly, and always starts with `//` or `/*`).
- `stripDelimited(rawText, openLen, closeLen, hasClose)` strips a fixed-length open/close delimiter pair
  (quotes). `hasClose` must come from the scan itself (whether it actually found a real closing delimiter,
  vs. running off the end of the file) - it can't be inferred from `rawText`'s length alone, since a
  well-formed literal can end exactly at EOF.
- `emitFragment(start, end, tags)` - for a template literal's literal fragments, which need no transform at
  all (`rawText === text`) and are simply skipped if empty (`end <= start`), unlike every other segment kind,
  which is always emitted even when its text is empty (e.g. `""`, `/**/`).

### Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated string/template ending mid-escape) lands on the end of `content`
instead of one past it. Every backslash-skip in `scanQuotedString`/`scanTemplateLiteral` goes through this -
without it, the emitted `range`/`map` can exceed `content.length`, inconsistent with the actual `rawText`
(this was a real bug, found by Copilot's review of `@cspell/parser-strings-comments` PR #60 before this
package was split out of it - see `parser.test.ts`'s "unterminated literals ending in a trailing lone
backslash" tests).

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`),
built as module-level constants (`COMMENT_BLOCK_DOC_TAG`, `STRING_TEMPLATE_TAG`, ...) rather than computed
per segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

## Known simplifications

See `README.md`'s [Known limitations](README.md#known-limitations) section for the user-facing note: this
scanner has no regex-literal awareness at all - correctly disambiguating a regex literal from division
requires tracking expression context (what token precedes it), which this scanner, like its C-family sibling
before the split, doesn't do. `canPrecedeString()` is a narrow, backward-looking mitigation rather than a
real fix: before treating a `'`/`"` as a real string's opening quote, it checks the one character right
before it. An identifier character or another quote there can never legitimately precede a real string in
valid JS/TS (`foo"bar"` and `"a"'b'` are both syntax errors), so seeing one is treated as "probably inside an
unrecognized regex character class" and the quote is left alone instead of kicking off a runaway "string"
scan. This covers the common cases (contractions like `don't`, character classes like `[\w"']`) without any
risk of misreading real code, but it's fundamentally limited to what a single preceding character can tell
you: a class that opens with a quote right after `[` (`/['"]/`) is truly ambiguous with a real string
starting right after an array literal's bracket, and still gets misread either way.

`scanCode` only calls `canPrecedeString` once it's seen a bare `/` since the last reset point
(`sawSlash`) - regex literals are rare, so this skips a regex test entirely for the overwhelming majority of
quotes, which are nowhere near a `/`. `sawSlash` is **sticky, not toggled**: it's set on any `/` and only
cleared at an actual reset point (a newline, or a recognized `//`/`/*`/`` ` `` token) - it does not flip back
to `false` on a second `/`. Toggling was tried first and is wrong: a division is a single, unpaired `/`, so
`a / b; const re = /don't/;` would toggle "on" for the division and then immediately toggle back "off" at the
regex's own opening `/`, turning the guard off right where it's needed and reintroducing the original bug for
that (common) pattern - see `parser.test.ts`'s "is not thrown off by an unrelated division..." test, which
fails against a toggled implementation.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid content in its own extension
  (`.ts`, `.tsx`, `.jsx`), which both exercises real file content and makes intent easier to read than an
  escaped string literal. `fixtures/` is excluded from `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a
  fixture's exact bytes - quote style, spacing, an unterminated literal's missing closing delimiter - are
  frequently what's being asserted on; don't let a formatter "fix" one.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in a segment the filter
  excludes) - sanity-checked by temporarily swapping in the plain `plugin` and confirming `cspell .` actually
  fails without the filter before restoring it, the way `packages/parser-typescript/samples/customize` does.
