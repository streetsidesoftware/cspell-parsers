# Contributing to @cspell/parser-ruby-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

Like `@cspell/parser-typescript-strings-comments` and `@cspell/parser-go-strings-comments`, this parser is a
single hand-written scanner (`Scanner`, a small stateful class holding a mutable cursor `i` over `content`).
There's no AST and no tokenizer for the language as a whole - `Scanner.scanCode` walks `content` character by
character, recognizing only the handful of constructs that matter (comments, plain strings, and heredocs) and
silently advancing `i` past everything else (identifiers, keywords, punctuation, numbers, symbols,
percent-literals). Since cspell only ever checks what's inside `parsedTexts`, this is how the parser excludes
syntax noise: by simply never emitting it, not by filtering it out afterwards.

### `scanCode`'s one exit condition

`scanCode(end, stopAtUnmatchedBrace)` is the core loop, called both at the top level (for the whole file) and
recursively for a `#{...}` interpolation hole inside a double-quoted string or an interpolated heredoc, which
doesn't have a known end index up front - only "the matching `}`". `stopAtUnmatchedBrace: true` makes
`scanCode` track its own brace depth and return as soon as it sees a `}` at depth 0, having consumed it.
Because this is the exact same function used for ordinary code, a string or comment nested inside the hole is
picked up and tagged completely normally - there's no separate "expression" scanner to keep in sync.

## `=begin`/`=end` block comments

Ruby only recognizes `=begin` and `=end` as comment markers when they sit at the very start of a line - not
merely "the text `=begin` appears somewhere". `scanCode` checks this explicitly before dispatching to
`scanBeginEndComment`:

```ts
if (c === '=' && (this.i === 0 || content[this.i - 1] === '\n') && content.startsWith('=begin', this.i)) {
```

Without the column-0 check, a variable or method call that happens to contain the literal text "=begin" mid-
line (e.g. `result =begin_value`, an admittedly contrived but real possible identifier) would incorrectly open
a block comment that swallows the rest of the file looking for a (possibly nonexistent) `=end`. `scanBeginEndComment`
itself then finds the closing marker the same way a heredoc finds its own closing marker (see below): via a
`^=end.*$` regexp with the multiline flag, which only matches `=end` at the start of a line and consumes the
rest of that line (real Ruby ignores whatever follows `=end` on its own line, e.g. `=end # note`) as part of
the (unscanned) footer, not as spell-checked content.

## Regex literals vs. division, and heredocs vs. left-shift/append

These are two different ambiguities in Ruby's grammar, but they share the exact same shape: a token (`/` or
`<<`) that can either open a brand-new literal (a regex, or a heredoc) or act as a binary operator continuing
whatever value came right before it (division, or left-shift/append). Both are resolved by the same function,
`isOperandContext(content, index)` - ported from `@cspell/parser-typescript-strings-comments`'s
`isDivisionContext`, generalized to cover both operators instead of just `/`:

```ts
function isOperandContext(content: string, index: number): boolean {
  let j = index - 1;
  while (j >= 0 && (content[j] === ' ' || content[j] === '\t')) j--;
  if (j < 0) return false;
  const ch = content[j];
  if (ch === ')' || ch === ']' || ch === '}') return true;
  if (!/[A-Za-z0-9_]/.test(ch)) return false;
  let wordStart = j;
  while (wordStart > 0 && /[A-Za-z0-9_]/.test(content[wordStart - 1])) wordStart--;
  return !EXPRESSION_START_KEYWORDS.has(content.slice(wordStart, j + 1));
}
```

It looks at whatever significant character (skipping inline whitespace) comes right before the ambiguous
token. An identifier/number that isn't one of `EXPRESSION_START_KEYWORDS`, a `)`, a `]`, or a `}` means a
value was already produced there, so the token must be a binary operator; anything else (an operator, `(`,
`,`, `=`, the start of the file, a keyword like `if` or `return`, ...) means a new expression is still
expected.

**`}` is deliberately biased toward "operator," not "new literal."** It's genuinely ambiguous - it closes
both a block (`arr.each { |x| ... }\n/regex/.test(y)`, where a regex commonly follows) and a hash/argument
list (`{ a: 1 } / 2`, where `/` is real division) - and the two failure modes aren't symmetric. Treating `}`
as operator-like and getting it wrong just means a real regex/heredoc isn't recognized (falling back to the
character-level `canPrecedeString` mitigation for regexes, below, or simply leaving `<<` as ordinary code for
heredocs - a fine outcome either way). Treating `}` as expression-context and getting _that_ wrong is worse:
`tryScanRegexLiteral` would attempt to parse real division as a regex, scanning ahead for the next unrelated
`/` in the file as if it were the closing delimiter and silently swallowing whatever real string or comment
sat in between - see `parser.test.ts`'s "treats a same-line `}`..." test, which reproduces exactly this.

`EXPRESSION_START_KEYWORDS` is deliberately not exhaustive - it covers Ruby's own control-flow/boolean
keywords (`if`, `unless`, `while`, `case`, `when`, `and`, `or`, `not`, ...) plus a handful of very common
method names that are frequently called without parens directly on a regex or heredoc argument (`puts`,
`print`, `raise`, `return`, `yield`, and Ruby's own regex-oriented `String`/`Enumerable` methods like `gsub`,
`sub`, `scan`, `match`, `split`, `grep`). A method call outside that list followed directly by a bare
regex/heredoc argument (no parens) won't be recognized - see `README.md`'s "Known limitations" for the
user-facing summary.

### `tryScanRegexLiteral` (the primary regex mechanism)

Once `isOperandContext` says "not an operator," `tryScanRegexLiteral` attempts to actually scan the regex
body - tracking `[...]` character-class depth (so an unescaped `/` inside a class, or a `]` that would
otherwise look like it ends the class early, doesn't end the regex prematurely) and backslash escapes (via
the same `skipEscape` strings/heredocs use) - up to a closing `/` and its trailing flag letters, or a `\n`
(this parser doesn't support a regex literal spanning multiple lines - see `README.md`). Finding a valid
closing `/` means skipping the whole regex as a single opaque unit: nothing inside it, including every quote
character, is ever spell checked - not because it's filtered out afterwards, but because **no `ParsedText` is
ever emitted for it at all**, per this package's explicit scope decision (see `README.md`'s "How it works").
This is what actually fixes the regex/quote ambiguity, including the one case a per-character heuristic alone
can never resolve: a class that opens with a quote right after `[` (`/['"]/`) is textually identical to a
real string starting right after an array literal's bracket (`['real string']`) - only knowing that a regex
is actually expected at that position (via `isOperandContext`) breaks the tie.

### `canPrecedeString` (the fallback, for what `tryScanRegexLiteral` misses)

A narrow, backward-looking mitigation rather than a real fix: before treating a `'`/`"` as a real string's
opening quote (and only once a bare `/` has been seen since the last reset point - see `sawSlash` below), it
checks the one character right before it. An identifier character or another quote there can never
legitimately precede a real string in valid Ruby (`foo"bar"` and `"a"'b'` are both syntax errors), so seeing
one is treated as "probably inside an unrecognized regex character class" and the quote is left alone instead
of kicking off a runaway "string" scan.

`sawSlash` is **sticky, not toggled** - the exact same reasoning as the TypeScript-family parser this was
ported from: it's set on any `/` and only cleared at an actual reset point (a newline, or a recognized `#`,
`=begin`/`=end`, heredoc, or quoted-string token), never flipped back to `false` on a second, unrelated `/`.
See that package's `CONTRIBUTING.md` for the full "why toggling is wrong" writeup - it applies here unchanged.

## Heredocs

`parseHeredocHeader` recognizes `<<~ID`, `<<-ID`, `<<ID`, and each of those with a `'ID'`/`"ID"` marker,
returning `undefined` (so the caller falls through to ordinary character handling) if what follows isn't
actually a validly-shaped marker - almost always because `isOperandContext` couldn't rule out that this was
really a `<<`/`<<=` left-shift/append operator.

`scanHeredocBody` then finds the closing marker the same way `@cspell/parser-strings-comments`'s PHP heredoc
support does: by matching a whole line, not a fixed-length delimiter -

```ts
const closeRe = new RegExp(`^[ \\t]*${escapeRegExp(markerId)}(?![A-Za-z0-9_])`, 'm');
```

`ID` alone on a line (optionally indented, not immediately followed by another identifier character so
`SQLite` doesn't accidentally match a `SQL` marker) closes the heredoc, regardless of which of the three
opener variants was used - this parser doesn't simulate `<<~`'s dedent transform (see `README.md`), so all
three behave identically for spell-checking purposes. Real Ruby actually requires a plain `<<ID` heredoc's
terminator at column 0 specifically (no leading whitespace), unlike `<<~`/`<<-`; this parser deliberately
doesn't distinguish that case (see `README.md`'s "Known limitations") since over-recognizing an indented
terminator only ever matters in already-invalid Ruby.

Once the closing marker's position is known, the body is emitted:

- **Non-interpolated** (a single-quoted `<<~'ID'` marker): the whole `[bodyStart, bodyEnd)` span is emitted
  as one `string.heredoc` fragment via `emitFragment`, with no escape or interpolation handling at all - the
  same "literal" treatment `scanSingleQuotedString` gives a plain `'...'` string, just without even the
  boundary-finding backslash skip (there's no closing quote to hunt for; the boundary is already known).
- **Interpolated** (bare or double-quoted marker): scanned exactly like `scanDoubleQuotedString`'s body,
  splitting into fragments around `#{...}` holes and recursing into `scanCode` for each one - just bounded by
  the already-known `bodyEnd` instead of searching for a closing `"`.

**The header line is deliberately not scanned as code.** Real Ruby allows more code after the marker on the
same line (`foo(<<~A, <<~B)`, `<<~A.freeze`) - this parser instead treats everything from the `<<` through the
end of that line as part of the (unscanned) header, exactly mirroring the simplification
`@cspell/parser-strings-comments`'s own PHP heredoc support already ships. This is why only one heredoc per
line is supported, and why a real string placed after a heredoc marker on the same line won't be spell
checked - see `README.md`'s "Known limitations".

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain, built as module-level constants (`STRING_HEREDOC_TAG`, ...) rather
than computed per segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a
consumer. Regex literals intentionally have no tag at all - see `README.md`.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline for the "typical case" coverage, and uses inline `parse()` calls (mirroring
  `@cspell/parser-typescript-strings-comments`'s own convention) for narrower regression tests where the exact
  surrounding content matters more than reading like a real file - the `isOperandContext`/`sawSlash`
  ambiguity cases, and the "ends in a trailing lone backslash at EOF" escape-handling edge cases.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling inside a heredoc that
  `{ 'string.heredoc': false }` excludes) - sanity-checked by temporarily swapping in the plain `plugin` and
  confirming `cspell .` actually fails without the filter before restoring it, the way
  `packages/parser-typescript/samples/customize` does.
