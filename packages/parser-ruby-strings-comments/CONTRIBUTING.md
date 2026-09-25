# Contributing to @cspell/parser-ruby-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

This parser is a single hand-written scanner (`Scanner`, a small stateful class holding a mutable cursor `i`
over `content`). There's no AST and no tokenizer for the language as a whole - `x` walks `content` character
by character, recognizing only the handful of constructs that matter (comments and strings). Everything
between them (x) is emitted as a `code` segment. `code` is `false` in `tags`, so the default filter built by
`createPluginParserWithFilterTags` drops it, and a user can turn it back on with `customizePlugin`.

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

## Regex, percent-literals, division, modulo, and char-literal-vs-ternary

Four different ambiguities in Ruby's grammar share the exact same shape: a token (`/`, `<<`, `%`, or `?`)
that can either open a brand-new literal (a regex, heredoc, percent-literal, or char literal) or act as a
binary operator continuing whatever value came right before it (division, left-shift/append, modulo, or the
ternary operator). All four are resolved by one function, `isOperandContext(content, index)` - ported from
`@cspell/parser-typescript-strings-comments`'s `isDivisionContext`, generalized to cover all four operators:

```ts
function isOperandContext(content: string, index: number): boolean {
  let j = index - 1;
  while (j >= 0 && (content[j] === ' ' || content[j] === '\t')) j--;
  if (j < 0) return false;
  const ch = content[j];
  if (ch === ')' || ch === ']' || ch === '}' || ch === "'" || ch === '"') return true;
  if (!/[A-Za-z0-9_]/.test(ch)) return false;
  let wordStart = j;
  while (wordStart > 0 && /[A-Za-z0-9_]/.test(content[wordStart - 1])) wordStart--;
  return !EXPRESSION_START_KEYWORDS.has(content.slice(wordStart, j + 1));
}
```

It looks at whatever significant character (skipping inline whitespace) comes right before the ambiguous
token. A `)`/`]`/`}`, a closing quote, or an identifier/number not in `EXPRESSION_START_KEYWORDS` means a
value was already produced there, so the token must be a binary operator; anything else (an operator, `(`,
`,`, `=`, the start of the file, a keyword like `if` or `return`, ...) means a new expression is still
expected.

**The closing-quote check (`'`/`"`) closes a real bug, not a hypothetical one:** without it, `"a"<<"b"` -
ordinary string append, no spaces - reads as a `<<"b"` heredoc opener (the closing `"` of `"a"` isn't a `)`,
`]`, `}`, or identifier character, so it used to fall through to "new expression expected"), swallowing
everything up to a line containing just `b` as the heredoc's own unscanned body. A quote character can only
appear immediately before one of these operators as the closing delimiter of a string `scanCode` already
consumed, so treating it as "a value was just produced" is always correct, never a heuristic guess.

**`}` is deliberately biased toward "operator," not "new literal."** It's genuinely ambiguous - it closes
both a block (`arr.each { |x| ... }\n/regex/.test(y)`, where a literal commonly follows) and a hash/argument
list (`{ a: 1 } / 2`, where `/` is real division) - and the two failure modes aren't symmetric. Treating `}`
as operator-like and getting it wrong just means a real literal isn't recognized (falling back to the
character-level `canPrecedeString` mitigation for regexes, below, or plain ordinary code otherwise - a fine
outcome either way). Treating `}` as expression-context and getting _that_ wrong is worse: `tryScanRegexLiteral`
would attempt to parse real division as a regex, scanning ahead for the next unrelated `/` in the file as if
it were the closing delimiter and silently swallowing whatever real string or comment sat in between - see
`parser.test.ts`'s "treats a same-line `}`..." test, which reproduces exactly this.

`EXPRESSION_START_KEYWORDS` is deliberately not exhaustive - it covers Ruby's own control-flow/boolean
keywords (`if`, `unless`, `while`, `case`, `when`, `and`, `or`, `not`, ...) plus a handful of very common
method names that are frequently called without parens directly on a regex or heredoc argument (`puts`,
`print`, `raise`, `return`, `yield`, and Ruby's own regex-oriented `String`/`Enumerable` methods like `gsub`,
`sub`, `scan`, `match`, `split`, `grep`). A method call outside that list followed directly by a bare literal
argument (no parens) won't be recognized - see `README.md`'s "Known limitations" for the user-facing summary.

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

### `tryScanPercentLiteral`

Once `isOperandContext` says "not an operator," `tryScanPercentLiteral` scans a percent-literal (`%w[]`,
`%i[]`, `%q()`, `%Q{}`, `%r{}`, `%s()`, `%x()`, or a type-letter-less `%(...)`) and skips it as one opaque
unit, exactly like `tryScanRegexLiteral` does for a regex - no `ParsedText` is ever emitted for its content.

This exists to fix a real bug, not just to add coverage: before it existed, an unrecognized percent-literal's
embedded quote (`%w[don't stop]`, `%q(it's fine)`) reached the ordinary quote dispatch in `scanCode` and
kicked off a runaway string scan - hunting for the next unrelated `'`/`"` in the file as the "closing quote"
and silently swallowing whatever real code sat in between. `parser.test.ts`'s `percent-literals.rb` suite
reproduces this.

Only a curated delimiter set is recognized - `( [ { <` (which nest: `%w(foo (bar) baz)` is one literal, so
`depth` tracks further opens the same way `scanBeginEndComment`/heredoc closing-marker matching track their
own structure) and a handful of same-character delimiters seen in real code (`| ! # / ~ ^`, none of which can
nest, since open and close are identical) - not "any non-alphanumeric character," which Ruby technically
allows. This is deliberately conservative for the same reason `isOperandContext` is biased toward "operator"
at a `}`: a modulo expression using an unusual character right after `%` must never be misread as a literal
opener (swallows real code), whereas missing an exotic percent-literal delimiter just leaves it as ordinary,
unscanned code (safe). An unterminated percent-literal is extended to EOF, the same as an unterminated
heredoc, rather than left as a dangling opener with its quote(s) still live to misread.

### The `?'`/`?"`/`?#` char-literal special case

Ruby's `?x` one-character-string literal never gets general recognition - a bare `?` is otherwise always
just ordinary code, since a single character has no prose worth checking (the same reasoning
`@cspell/parser-rust-strings-comments` applies to Rust char literals). But `?'`, `?"`, and `?#` are the one
shape that needs its own check: left unrecognized, that second character would reach the quote/comment
dispatch in `scanCode` and run away exactly like an unrecognized percent-literal's embedded quote does (see
above) - `?'` swallows real code hunting for the next `'`, and `?#` gets misread as a real comment to
end-of-line. `scanCode` special-cases exactly this, gated by `isOperandContext` since `?` is also the
ternary operator:

```ts
if (c === '?' && !isOperandContext(content, this.i) && (n === "'" || n === '"' || n === '#')) {
  this.i += 2;
  sawSlash = false;
  continue;
}
```

The `isOperandContext` gate is what keeps this from misfiring on a ternary: `cond ? 'a' : 'b'` has a value
(`cond`) right before the `?`, so `isOperandContext` returns `true` and this check never fires, leaving `?`
as ordinary code and `'a'`/`'b'` to be recognized normally by the ordinary quote dispatch - true whether or
not there's a space after `?` (`cond ?'a':'b'` resolves the same way, matching real Ruby's own lexer
behavior for this same ambiguity).

### `scanInterpolatedString` and backtick command strings

A backtick command string (`` `cmd` ``) follows the exact same escape/interpolation grammar as a
double-quoted string - so rather than a separate method, `scanInterpolatedString(quoteChar, tags)` takes the
delimiter and tag as parameters, and `scanCode` calls it once for `"` (`STRING_DOUBLE_TAG`) and once for `` ` ``
(`STRING_BACKTICK_TAG`). Unlike every other literal opener in this file, a backtick needs no
`isOperandContext` gating at all - Ruby has no other use for a bare backtick, so there's no operator it could
be confused with. Recognizing it closes the same class of bug as percent-literals and `?'`/`?"`/`?#`: an
embedded quote or `#` inside an unrecognized `` `...` `` would otherwise reach the ordinary dispatch and run
away - see `fixtures/char-literals-and-backticks.rb`.

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
const indent = allowIndentedTerminator ? '[ \\t]*' : '';
const closeRe = new RegExp(`^${indent}${escapeRegExp(markerId)}[ \\t]*$`, 'm');
```

`ID` alone on a line, with only trailing whitespace allowed after it, closes the heredoc - requiring the
end-of-line anchor, not just "not immediately followed by an identifier character", matters: without it, a
body line like `SQL:` or `SQLite text` would still start with the marker `SQL` followed by a non-identifier
character and wrongly close the heredoc early, even though the marker isn't alone on that line.

Leading whitespace before the marker is allowed only when `header.allowIndentedTerminator` is set - true for
`<<~ID`/`<<-ID`, false for a plain `<<ID` opener, which `parseHeredocHeader` records based on whether it saw
a `~`/`-` right after `<<`. Real Ruby requires a plain heredoc's terminator at column 0 specifically; an
earlier version of this parser treated all three opener variants identically, on the reasoning that
over-recognizing an indented terminator could only matter in an already-invalid program. **That reasoning
was wrong**: a plain heredoc's body can legitimately contain an _indented_ line that happens to equal the
marker word - it's ordinary body content, not the terminator, precisely because it isn't at column 0 - and
the old code would still close the heredoc there, silently dropping the rest of the (valid) body from spell
checking. `fixtures/heredocs.rb`'s `plain_with_indented_lookalike` and its test in `parser.test.ts`
reproduce this.

Once the closing marker's position is known, the body is emitted:

- **Non-interpolated** (a single-quoted `<<~'ID'` marker): the whole `[bodyStart, bodyEnd)` span is emitted
  as one `string.heredoc` fragment via `emitFragment`, with no escape or interpolation handling at all - the
  same "literal" treatment `scanSingleQuotedString` gives a plain `'...'` string, just without even the
  boundary-finding backslash skip (there's no closing quote to hunt for; the boundary is already known).
- **Interpolated** (bare or double-quoted marker): scanned exactly like `scanInterpolatedString`'s body,
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
segment carries its whole ancestor chain, built as module-level constants (`STRING_HEREDOC_TAG`,
`STRING_BACKTICK_TAG`, ...) rather than computed per segment. See `README.md`'s [Tags](README.md#tags) table
for what each one means to a consumer. Regex and percent-literals intentionally have no tag at all - see
`README.md`. Char literals have no tag either, since (aside from the `?'`/`?"`/`?#` special case) they're
never recognized in the first place.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline for the "typical case" coverage - including `fixtures/percent-literals.rb`
  (each percent-literal form plus nested-bracket depth tracking) and `fixtures/char-literals-and-backticks.rb`
  (the `?'`/`?"`/`?#` special case, a plain char literal, a ternary both with and without a space, and backtick
  command strings with and without interpolation) - and uses inline `parse()` calls (mirroring
  `@cspell/parser-typescript-strings-comments`'s own convention) for narrower regression tests where the
  exact surrounding content matters more than reading like a real file - the `isOperandContext`/`sawSlash`
  ambiguity cases (including the `"a"<<"b"` closing-quote regression) and the "ends in a trailing lone
  backslash at EOF" escape-handling edge cases.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in a segment the filter
  excludes). Check it both ways: run cspell with the sample's config and with `plugin.defineConfig()`, each with
  `--no-config-search`, so the sample's own config doesn't apply to both runs.
