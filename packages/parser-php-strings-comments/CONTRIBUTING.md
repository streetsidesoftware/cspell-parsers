# Contributing to @cspell/parser-php-strings-comments

This is a contributor-facing walkthrough of how `src/parser.ts` actually works. `README.md` is written for
someone using the plugin; this file is for someone changing it. See the repo root `CONTRIBUTING.md` for the
general package shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`) - this
file only covers what's specific to this package's parsing logic.

## Shape of the parser

Like this repo's other split-out language packages, this is a single hand-written scanner (`Scanner`, a
small stateful class holding a mutable cursor `i` over `content`). There's no AST and no tokenizer for PHP as
a whole - the scanner walks `content` character by character, recognizing only the handful of constructs
that matter (markup, comments, and strings) and silently advancing `i` past everything else.

This package started as the PHP slice of `@cspell/parser-strings-comments`, a single scanner that also
covered C, C++, C#, Go, Java, and JavaScript/TypeScript. Splitting each language family into its own package
removes the `Dialect` branching that combined scanner needed everywhere (`if (dialect === 'php') ...`) -
since this package only ever handles PHP, there's exactly one dialect-specific concept left: the markup/code
mode toggle below, which is intrinsic to PHP itself (embedding in HTML is what PHP is _for_), not the kind of
cross-language branching the split removes.

### The markup/code mode toggle

PHP is the only one of this repo's split-out language families with a genuine two-mode structure. A `.php`
file is, at the top level, HTML (or any other text) with PHP code embedded between `<?php`/`<?=`/`<?` and
`?>` boundaries - so unlike every other package here, this one's entry point (`run`/`scanPhpDocument`)
itself has to alternate between two fundamentally different scans, not just call straight into `scanCode`:

- `scanPhpDocument` repeatedly finds the next PHP open tag (`findPhpOpenTag`), emits everything before it as
  a `markup`-tagged segment (verbatim, no transform), then hands off to `scanCode` starting right after the
  tag.
- `scanCode` runs in `phpAware` mode: as soon as it sees a top-level `?>`, it stops and returns control to
  `scanPhpDocument`, which resumes looking for the next open tag. If no `?>` appears, `scanCode` runs to the
  end of the file (a file that never leaves PHP mode after its one `<?php`, which is the common case).
- `findPhpOpenTag` recognizes three open-tag forms: `<?php` (matched case-insensitively, with a word-boundary
  check via `isIdentChar` on the character right after it, so a bare identifier starting with `<?php...` -
  not that this is valid PHP either way - doesn't false-positive), `<?=` (the "short echo" tag,
  `<?= $expr ?>`, equivalent to `<?php echo $expr; ?>`), and a bare `<?` (short open tag) as the fallback.

A `?>` can also appear _inside_ a `//`/`#` line comment, and PHP's own grammar says it still closes PHP mode
right there - the rest of the line becomes HTML, not comment text. `scanLineComment` returns both the
`ParsedText` for the comment (ending exactly at the `?>`, not including it) and a `closesPhp` flag; `scanCode`
checks that flag after yielding the comment and returns immediately if it's set, so control passes back to
`scanPhpDocument` without scanning any further PHP-mode constructs on that line.

### `#` vs `#[`

`#` alone starts a line comment, PHP's alternative to `//`. But `#[` is the start of a PHP 8 attribute
(`#[Attribute]`, `#[Deprecated(reason: '...')]`) - real code, not a comment - so `scanCode` only treats `#`
as a comment marker when the very next character isn't `[`. Getting this wrong in either direction is bad:
treating every `#[...]` as a comment would swallow real attribute syntax (and anything after it on the line)
as comment text; treating `#[` as ordinary code but still allowing a bare `#` right before `[` to start a
comment (i.e. checking the wrong side of the boundary) would do the opposite. See `fixtures/attributes.php`
and its tests for both directions.

### Complex interpolation (`{$...}`): skipped, not split

A double-quoted string and a heredoc both allow PHP's "complex" interpolation syntax, `{$expr}`, inside
otherwise-literal text. Unlike a JS template literal's `${...}` hole or a C#-style interpolated string's
`{...}` hole - which this repo's other packages split into separate `ParsedText` fragments and recursively
scan as code - PHP's `{$...}` hole is **skipped over as opaque text, right along with the rest of the
string**, and the whole thing (including the hole's own contents) is emitted as one `ParsedText`.

This is a deliberate simplification, not an oversight: an interpolation hole's contents are almost always a
short variable/property/array-index expression (`{$arr['key']}`, `{$user->name}`), not prose worth spell
checking on its own, and unlike JS's `${...}` (which can hold arbitrary expressions including nested string
literals worth checking independently), splitting it out would mostly just produce noise. The one thing that
_does_ matter is not letting the hole's own punctuation - specifically a nested quote - fool the scanner into
thinking the string ended early.

- `skipPhpBraceInterpolation(content, start)` walks from the hole's opening `{` tracking brace depth (so a
  nested `{...}` inside the hole doesn't end it early) until the matching `}`.
- Within the hole, `skipSimpleQuoted` skips over any `'...'`/`"..."` run it finds - this is what makes
  `"{$arr['key']}"` safe: without it, the `'` in `'key'` would look exactly like it could be relevant to the
  outer string's own delimiter tracking. The real risk case - and a genuine bug caught by Copilot's review of
  the combined `@cspell/parser-strings-comments` package before this was split out - is when the _nested_
  quote matches the _outer_ delimiter, e.g. `"{$arr["key"]}"`: without actually skipping the hole as a unit,
  the inner `"` looks exactly like the string's own closing quote. See `fixtures/interpolation.php` and its
  two tests (nested quote not matching vs. matching the outer delimiter) for both cases.

### Heredoc and nowdoc

`scanHeredoc` handles both `<<<ID ... ID` (heredoc - interpolated, like a double-quoted string, same
skip-not-split `{$...}` handling as above) and `<<<'ID' ... ID` (nowdoc - literal, like a single-quoted
string, no interpolation at all). Unlike a quoted string's fixed one-character delimiter, a heredoc/nowdoc's
closing marker is an identifier that has to be matched as a whole line: `^[ \t]*ID(?![A-Za-z0-9_])`, allowing
PHP's "flexible heredoc" leading indentation but requiring the identifier not be immediately followed by
another identifier character (so a closing marker `EOT` doesn't false-positive inside a body line that merely
starts with `EOTHING` - see `fixtures/mixed.php`'s heredoc body, which exercises exactly this). Because the
close is found this way - as a whole-line match, not a single delimiter character - nested quotes and braces
in the body never need the same interpolation-aware handling `scanQuotedString` requires; only the `{$...}`
hole itself still needs `skipPhpBraceInterpolation`, for the same reason it does inside a double-quoted
string.

### Emitting a segment

Every segment (comment, string, heredoc/nowdoc, markup) is built from a `[start, end)` range the scan already
knows, the same way as every other package in this repo:

- Line comments use a local `stripLineMarker(rawText, markerLen)` rather than `@internal/utils`'s
  `stripCommentMarkers` - PHP's line-comment markers aren't a fixed length (`#` is 1 character, `//` is 2),
  unlike every other dialect this repo covers.
- Block comments (`/* ... */`, including PHPDoc `/** ... */`) reuse `stripCommentMarkers` directly, since
  PHP's block-comment syntax is identical to C-family block comments.
- `stripDelimited(rawText, openLen, closeLen, hasClose)` strips a fixed-length open/close pair (quotes, or a
  heredoc/nowdoc's header/footer). `hasClose` must come from the scan itself (whether a real closing
  delimiter was actually found, vs. running off the end of the file) - it can't be inferred from `rawText`'s
  length alone, since a well-formed literal can end exactly at EOF.
- A markup segment needs no transform at all (`rawText === text`) and is only emitted when non-empty (two
  adjacent PHP regions with nothing between them shouldn't produce a spurious empty markup segment).

### Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated string ending mid-escape) lands on the end of `content` instead of
one past it - without this, the emitted `range`/`map` can exceed `content.length`. See `parser.test.ts`'s
"unterminated literals ending in a trailing lone backslash" test.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`),
built as module-level constants rather than computed per segment. `markup` is the one tag in this package
that deliberately has no ancestor - it isn't a kind of `string` or `comment`, so it stands alone at the top
level. See `README.md`'s [Tags](README.md#tags) table for what each one means to a consumer.

### Why `customizePlugin`/`createParser` filtering works with any cspell version

`plugin.ts`'s `customizePlugin` and `parser.ts`'s `createParser` both filter by wrapping this package's
`parser` in `@internal/utils`'s `customizeParser` (see `packages/internal-utils/src/customize.ts`), which
compiles the `tags` option into a `TagsFilter` once and uses it to drop excluded entries from `parse()`'s own
`parsedTexts` before returning. The filtering therefore happens entirely inside this package's parser, before
its result ever reaches cspell - cspell just sees an ordinary parser whose `parse()` already omits the
excluded segments. That's why `README.md` can tell users it works with any cspell version: there's no
dependency on cspell itself supporting tag-based filtering.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid PHP, which both exercises real
  file content and makes intent easier to read than an escaped string literal. `fixtures/` is excluded from
  `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes are frequently what's being
  asserted on; don't let a formatter "fix" one.
- Each non-obvious piece of scanning logic has its own dedicated fixture: `attributes.php` (`#[...]` vs. `#`
  comments), `close-tag.php` (`?>` ending PHP mode, including mid-line-comment), `short-echo.php` (`<?=`),
  `heredoc-nowdoc.php`, and `interpolation.php` (the nested-quote-inside-`{$...}` case) - in addition to
  `mixed.php` and `strings.php` for the more ordinary cases. When changing any of this logic, prefer adding
  to or extending one of these over inlining a one-off string in the test file itself.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). `samples/customize` in particular proves the
  `customizePlugin` tag filter is doing something real (a genuine misspelling in the markup the filter
  excludes) - sanity-checked by temporarily swapping in the plain `plugin` and confirming `cspell .` actually
  fails without the filter before restoring it, the way `packages/parser-typescript/samples/customize` does.

<!-- cspell:ignore EOTHING -->
