# Contributing to @cspell/parser-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

Unlike `@cspell/parser-typescript` (a real tree-sitter grammar), this parser is a single hand-written scanner
(`Scanner`, a small stateful class holding a mutable cursor `i` over `content`) shared across every supported
language. There's no AST and no tokenizer for the language as a whole - `Scanner.scanCode` walks `content`
character by character, recognizing only the handful of constructs that matter (comments, strings, and each
dialect's extra literal forms) and silently advancing `i` past everything else (identifiers, keywords,
punctuation, numbers). Since cspell only ever checks what's inside `parsedTexts`, this is how the parser
excludes syntax noise: by simply never emitting it, not by filtering it out afterwards - the same approach
`@cspell/parser-example` and `@cspell/parser-typescript` both use.

### Dialects

`detectDialect(filename)` picks one of six `Dialect`s (`'c' | 'csharp' | 'go' | 'java' | 'js' | 'php'`) from
the file extension via `EXTENSION_DIALECT`, falling back to `'c'` (the most conservative baseline - plain
`//`/`/* */`/`'...'`/`"..."`) for anything unrecognized. `dialect` is threaded through every scanning method
and gates each language-specific form: C++ raw strings and PHP's `#`/heredoc only fire for their own dialect,
C#'s `///`/verbatim/interpolated/raw-string forms only for `'csharp'`, backtick-as-raw-string only for `'go'`
(as opposed to backtick-as-template-literal for `'js'` - the same delimiter means two different things
depending on dialect, so `scanCode`'s dispatch checks `dialect` before deciding which one applies), and so on.
Plain `//`, `/* */`, `'...'`, and `"..."` are unconditional - every dialect gets those.

### `scanCode`'s two exit conditions

`scanCode(end, stopAtUnmatchedBrace, phpAware)` is the core loop, called both at the top level (for the whole
file) and recursively for two different reasons:

- **Interpolation holes.** A JS/TS template literal's `${...}` or a C# interpolated string's `{...}` doesn't
  have a known end index up front - only "the matching `}`". `stopAtUnmatchedBrace: true` makes `scanCode`
  track its own brace depth and return as soon as it sees a `}` at depth 0, having consumed it. Because this
  is the exact same function used for ordinary code, a string or comment nested inside the hole (e.g.
  `` `${a ? 'x' : 'y'}` ``) is picked up and tagged completely normally - there's no separate "expression"
  scanner to keep in sync.
- **PHP's `<?php ... ?>` boundary.** `phpAware: true` makes a top-level `?>` end the call immediately (see
  "PHP" below).

### Emitting a segment

Every `out.push(...)` site builds a `ParsedText` from a `[start, end)` range it already knows, using one of
two small delimiter-stripping helpers rather than `@internal/utils`'s `stripCommentMarkers`/
`decodeStringParts` (which assume a real grammar already split escapes/fragments out for you):

- `stripLineMarker(rawText, markerLen)` - a marker-length-parameterized version of
  `stripCommentMarkers`'s own line-comment case, needed because this package's line markers aren't all two
  characters (`#` is 1, `///` is 3).
- `stripDelimited(rawText, openLen, closeLen, hasClose)` - strips a fixed-length open/close delimiter pair
  (quotes, backticks, a heredoc's `<<<ID\n` header/`\nID` footer, ...). `hasClose` must come from the scan
  itself (whether it actually found a real closing delimiter, vs. running off the end of the file) - it can't
  be inferred from `rawText`'s length alone, since a well-formed literal can end exactly at EOF.
- `emitFragment(start, end, tags)` - for an interpolated form's literal fragments, which need no transform at
  all (`rawText === text`) and are simply skipped if empty (`end <= start`), unlike every other segment kind,
  which is always emitted even when its text is empty (e.g. `""`, `/**/`).

Block comments reuse `@internal/utils`'s `stripCommentMarkers` directly (it already handles the doc-comment
gutter-stripping correctly, and always starts with `/*`), but plain/triple-slash line comments go through the
local `stripLineMarker` instead of `stripCommentMarkers`'s own line-comment path, since that path is hardcoded
to a 2-character `//`.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.line.doc` also carries `comment.line` and `comment`), built
as module-level constants (`COMMENT_LINE_DOC_TAG`, `STRING_HEREDOC_TAG`, ...) rather than computed per
segment. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

A couple of tags are unique to this package:

- `comment.line.doc` (C#'s `///`) exists because C# has no block doc-comment form - `scanLineComment` detects
  it by checking for a third `/` (and that a fourth one doesn't follow, so a `////` separator comment isn't
  mistaken for one).
- `string.verbatim` and `string.interpolated` are independent booleans, not a single enum-like tag, because a
  C# string can be both at once (`$@"..."`/`@$"..."`) - see `tryScanCSharpString`'s three-way dispatch
  (verbatim-only, interpolated-only, or both) and the combined `STRING_VERBATIM_INTERPOLATED_TAG` constant.
- `markup` (see "PHP" below) has no ancestor - it isn't a `string` or a `comment`, just plain pass-through
  text.

## PHP

PHP is the one dialect that isn't "just code from start to end" - a `.php` file alternates between literal
HTML and `<?php ... ?>` code blocks. `scanPhpDocument` is PHP's own top-level loop (used instead of a single
`scanCode(content.length, false, false)` call): it finds the next `findPhpOpenTag` (`<?php`, `<?=`, or bare
`<?`), emits everything before it as one untagged-except-`markup` `ParsedText` (see the PHP HTML handling
decision in the PR/conversation this package was built from - the alternative, dropping that text entirely,
would silently stop spell checking markup that today gets checked by cspell's default no-parser behavior),
then calls `scanCode(content.length, false, true)` with `phpAware: true` for the code block.

`phpAware` reproduces a real (if obscure) PHP quirk: a `?>` closing tag ends a `//`/`#` line comment - and PHP
mode itself - immediately, even before the line's actual newline (`scanLineComment`'s `closesPhp` return
value, checked by every `scanCode` call site that can trigger it). A `?>` inside a `/* */` block comment or a
string does **not** do this - only the two line-comment forms are special-cased, matching PHP's own behavior.

PHP's `{$...}` complex string interpolation (inside a double-quoted string or a heredoc) can itself contain
quote characters (`"{$arr['key']}"`) that would otherwise look like the string's own closing quote to a naive
scan. `skipPhpBraceInterpolation` (used by `scanQuotedString`, not by `scanHeredoc`) handles this by tracking
brace depth and skipping any nested `'...'`/`"..."` run it finds along the way via `skipSimpleQuoted`.
`scanHeredoc` doesn't need the equivalent: unlike a quoted string, a heredoc's closing marker is found by
matching a whole line (`^[ \t]*ID(?![A-Za-z0-9_])`, multiline), which doesn't care what characters (quotes
included) appear in the body at all.

## Known simplifications

See `README.md`'s [Known limitations](README.md#known-limitations) section for the user-facing list (no
JS/TS regex-literal awareness, no hole-splitting for C# interpolated raw strings, no heredoc/raw-string
indentation dedenting). All of them were deliberate scope cuts to keep the scanner a single flat file instead
of a full grammar per language - see `scanCSharpRawString`'s doc comment for the reasoning on the
interpolated-raw-string one specifically.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid content in its own extension
  (`.c`, `.cpp`, `.cs`, `.go`, `.java`, `.ts`, `.tsx`, `.php`, ...), which both exercises `detectDialect` for real and
  makes intent easier to read than an escaped string literal. `fixtures/` is excluded from `tsc`/ESLint/
  Prettier (see root `CLAUDE.md`) because a fixture's exact bytes - quote style, spacing, an unterminated
  literal's missing closing delimiter - are frequently what's being asserted on; don't let a formatter "fix"
  one.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). Every sample `.php` file deliberately starts
  with `<?php` and never closes it (a normal PHP convention for a pure-code file) - this sidesteps needing
  the HTML `markup` segments' text to pass `cspell .` against whatever dictionary is active, since that
  pass-through behavior is already covered directly (dictionary-independent) by `fixtures/mixed.php`'s unit
  tests. If you add a sample that does include real markup, keep its prose simple enough to pass `cspell .`
  under the default dictionary (no raw HTML tag soup) or it'll fail CI in a way that has nothing to do with
  the parser itself.
