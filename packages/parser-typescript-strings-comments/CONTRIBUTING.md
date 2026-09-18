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

Every emit site (a `yield` in the `Scanner` generators) builds a `ParsedText` from a `[start, end)` range it already knows:

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

## Regex literals and `RegExp(...)` calls

Regex patterns aren't prose - per the user request this was built from, they're deliberately never spell
checked, the same way keywords and punctuation never are. Two mechanisms cooperate to make that work, from
most to least precise:

### `tryScanRegexLiteral` + `isDivisionContext` (the primary mechanism)

`/pattern/flags` and division (`a / b`) share the same leading character, which a scanner without full
expression parsing can't tell apart by looking at the `/` alone. `isDivisionContext(content, slashIndex)`
resolves it the same way a real JS tokenizer does: by looking at whatever significant character (skipping
inline whitespace) comes right before the `/`. An identifier/number that isn't one of
`REGEX_CONTEXT_KEYWORDS`, a `)`, a `]`, or a `}` means a value was already produced there, so `/` must be
division; anything else (an operator, `(`, `,`, `=`, the start of the file, a keyword like `return` or
`typeof`, ...) means an expression is still expected, so `/` can only be a regex's opening delimiter.

When `isDivisionContext` says "not division," `tryScanRegexLiteral` attempts to actually scan the regex body

- tracking `[...]` character-class depth (so an unescaped `/` inside a class, or a `]` that would otherwise
  look like it ends the class early, doesn't end the regex prematurely) and backslash escapes (via the same
  `skipEscape` strings/templates use) - up to a closing `/` and its trailing flag letters. Finding one means
  skipping the whole regex as a single opaque unit, exactly like any other code this scanner doesn't check:
  nothing inside it, including every quote character, ever reaches the string dispatch at all. This is what
  actually fixes the regex/quote ambiguity, including the one case a per-character heuristic alone can never
  resolve: a class that opens with a quote right after `[` (`/['"]/`) is textually identical to a real
  string starting right after an array literal's bracket (`["real string"]`) - only knowing that a regex is
  actually expected at that position (via `isDivisionContext`) breaks the tie.

**`}` is deliberately biased toward "division," not "regex."** It's genuinely ambiguous - it closes both a
block statement (after which a real regex commonly follows: `if (x) {}\n/regex/.test(y)`) and an object
literal (after which `/` is real division: `{a: 1} / 2`) - and the two failure modes aren't symmetric.
Treating `}` as division-like and getting it wrong just means a real regex isn't recognized, falling back to
the character-level mitigation below (a fine outcome). Treating `}` as regex-context and getting _that_
wrong is worse: `tryScanRegexLiteral` would then attempt to parse real division as a regex, scanning ahead
for the next unrelated `/` in the file as if it were the closing delimiter and silently swallowing whatever
real string or comment happened to sit in between (see `parser.test.ts`'s "treats a same-line `}`..." test,
which reproduces exactly this and fails if `}` is removed from `isDivisionContext`'s check - the fixture's
own equivalent case doesn't catch it, since its statements are on separate lines and `tryScanRegexLiteral`
already bails out at the first newline it meets, for unrelated reasons).

`tryScanRegExpCallArgs` (detected via a plain `c === 'R'` check, since `scanCode` doesn't otherwise tokenize
identifiers) handles the same "not spell check the pattern" intent for `RegExp(...)`/`new RegExp(...)`,
where the pattern is an ordinary string argument rather than special syntax. It requires a word boundary on
both sides of the literal text `RegExp` (so `MyRegExpUtils(...)` and `RegExp2` are correctly left alone),
then scans the whole argument list tracking paren depth - not just the first argument - skipping every
string literal it finds via `skipQuotedStringSilently` (identical to `scanQuotedString`'s boundary-finding,
just without emitting anything) while still recognizing comments inside the call normally via the ordinary
`scanLineComment`/`scanBlockComment`.

### `canPrecedeString` + `sawSlash` (the fallback, for what the primary mechanism misses)

See `README.md`'s [Known limitations](README.md#known-limitations) for the user-facing summary of when this
still matters: mainly right after a keyword not in `REGEX_CONTEXT_KEYWORDS`, or right after a `}` that was
actually closing a block statement rather than an object literal. `canPrecedeString` is a narrow,
backward-looking mitigation rather than a real fix: before treating a `'`/`"` as a real string's opening
quote, it checks the one character right before it. An identifier character or another quote there can never
legitimately precede a real string in valid JS/TS (`foo"bar"` and `"a"'b'` are both syntax errors), so seeing
one is treated as "probably inside an unrecognized regex character class" and the quote is left alone
instead of kicking off a runaway "string" scan. This covers the common cases (contractions like `don't`,
character classes like `[\w"']`) without any risk of misreading real code, but it's fundamentally limited to
what a single preceding character can tell you: a class that opens with a quote right after `[` (`/['"]/`)
is truly ambiguous with a real string - the primary mechanism above is what actually resolves that one.

`scanCode` only calls `canPrecedeString` once it's seen a bare `/` since the last reset point
(`sawSlash`) - regex literals are rare, so this skips a regex test entirely for the overwhelming majority of
quotes, which are nowhere near a `/`. `sawSlash` is **sticky, not toggled**: it's set on any `/` and only
cleared at an actual reset point (a newline, or a recognized `//`/`/*`/`` ` `` token) - it does not flip back
to `false` on a second `/`. Toggling was tried first and is wrong: a division is a single, unpaired `/`, so
`a / b; const re = /don't/;` would toggle "on" for the division and then immediately toggle back "off" at the
regex's own opening `/`, turning the guard off right where it's needed and reintroducing the original bug for
that (common) pattern - see `parser.test.ts`'s "is not thrown off by an unrelated division..." test, which
fails against a toggled implementation. (In practice `tryScanRegexLiteral` now recognizes that exact case
directly, independent of `sawSlash` entirely - this test was kept as regression coverage for the fallback
mechanism itself, in case a future change stops the regex from being recognized as one.)

It's also deliberately **not** reset right after `scanQuotedString` accepts a quote as a real string - see
that call site's own comment for the specific regex shape (`/"quoted"|it's/`) that would otherwise slip
through.

## Module specifiers

`isModuleSpecifierContext(content, quoteIndex)` tags a string as a module specifier using the same
"grammar forces adjacency" reasoning as `isDivisionContext`/`tryScanRegExpCallArgs`, rather than any real
understanding of import/export/call syntax: none of `import x from 'y'`, `import 'y'`,
`export { x } from 'y'`, `import('y')`, or `require('y')` allow anything but whitespace between the
relevant keyword (`from`, a bare `import`) or call name (`import`, `require`) and the specifier string, so
checking that adjacency is enough to identify them without parsing the surrounding statement at all.

This is why `const from = 'y'` (a variable literally named `from`) and `myRequire('y')` (an unrelated
function that merely contains "require") are both safely left untagged: in the first, the `=` sits between
`from` and the string; in the second, `precedingWord` naturally returns the whole word `myRequire`, not the
suffix `require`, since it scans backward through every contiguous identifier character. Per the request this
was built from, this detection deliberately isn't exhaustive - missing a real module specifier just means
it's spell checked like any other string, never that anything is misread, so there was no need to chase
every edge case (template-literal specifiers, `import.meta`, re-exports of a re-export, ...) the way the
regex-vs-division ambiguity above did.

Unlike a regex literal or a `RegExp(...)` call's arguments, a module specifier is **not** excluded from
spell checking outright - it gets extra tags (`module`/`module.specifier`/`module.specifier.literal`, plus
`.module` appended to its own quote-style tag, matching `@cspell/parser-typescript`'s convention exactly) so
`customizePlugin` can filter it out per consumer, since a relative path or package name is sometimes still
worth checking and sometimes isn't.

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
