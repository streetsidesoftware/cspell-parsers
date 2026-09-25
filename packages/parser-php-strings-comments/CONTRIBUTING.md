# Contributing to @cspell/parser-php-strings-comments

This is a contributor-facing walkthrough of how this package's parsing logic actually works. `README.md` is
written for someone using the plugin; this file is for someone changing it. See the repo root
`CONTRIBUTING.md` for the general package shape (`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`,
`samples/`) - this file only covers what's specific to this package's parsing logic, which is split across
three `src/` files beyond the usual template shape:

- `scanner.ts` - the actual scan: `Scanner`, a small stateful class holding a mutable cursor `i` over
  `content`, plus every helper function it uses. There's no AST and no tokenizer for PHP as a whole - the
  scanner walks `content` character by character, recognizing the handful of constructs that get their own
  specific tag (comments, strings) and letting a second cursor, `j`, sweep up everything else it advances `i`
  past as plain `html`/`code` (see "Emitting a segment" below).
- `tags.ts` - every tag `Scanner` can emit, and the derived `tags` map `parser.ts` passes to
  `createPluginParserWithFilterTags` (see "Tags" below).
- `parser.ts` - thin wiring: `parse()` just calls `new Scanner(content).run()`, and `parser` is
  `createPluginParserWithFilterTags({ name, parse, supportedFileTypes, tags })`. Its default filter comes
  from `tags` (see "Why `code` and `html` are off by default" below).

### The html/code mode toggle

PHP is the only one of this repo's split-out language families with a genuine two-mode structure. A `.php`
file is, at the top level, HTML (or any other text) with PHP code embedded between `<?php`/`<?=`/`<?` and
`?>` boundaries - so unlike every other package here, this one's entry point (`run`/`scanPhpDocument`)
itself has to alternate between two fundamentally different scans, not just call straight into `scanCode`:

- `scanPhpDocument` repeatedly finds the next PHP open tag (`findPhpOpenTag`), emits everything before it as
  an `html`-tagged segment (verbatim, no transform), then hands off to `scanCode` starting right after the
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

### The `code` tag: catching everything `scanCode` itself skips over

`scanCode` only ever yields a `ParsedText` for a comment, string, or heredoc/nowdoc - identifiers, keywords,
punctuation, numbers, and the `<?php`/`<?=`/`<?`/`?>` delimiters themselves just advance `i` with no segment
of their own. Rather than teach `scanCode`/`scanPhpDocument` to also yield those bits directly (which would
mean every call site remembering to flush whatever it skipped), `run()` derives them after the fact: a second
cursor, `j`, trails behind `i`, tracking how far the segments already yielded have covered. For each
`ParsedText` `scanPhpDocument` yields, `emitCodeSegment` checks whether it starts exactly where `j` left off;
if there's a gap, that gap becomes a `code`-tagged `ParsedText` of its own, emitted just before the real one.
Once `scanPhpDocument` is exhausted, `run()` flushes one final `code` segment for anything left between `j`
and the end of the file - necessary because a PHP region that never hits `?>` (or has no comment/string in
its tail) would otherwise leave that trailing code unaccounted for. This is why `emitCodeSegment` is called
uniformly on every segment `scanPhpDocument` yields, including its own `html` segments: the gap immediately
before an `html` segment is exactly the PHP code (if any) between the last comment/string and the `?>`/EOF
that ended the PHP region.

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
  outer string's own delimiter tracking. The real risk case is when the _nested_
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

Every segment (comment, string, heredoc/nowdoc, html, code) is built from a `[start, end)` range the scan
already knows, the same way as every other package in this repo:

- Line comments use a local `stripLineMarker(rawText, markerLen)` rather than `@internal/utils`'s
  `stripCommentMarkers` - PHP's line-comment markers aren't a fixed length (`#` is 1 character, `//` is 2),
  unlike every other dialect this repo covers.
- Block comments (`/* ... */`, including PHPDoc `/** ... */`) reuse `stripCommentMarkers` directly, since
  PHP's block-comment syntax is identical to C-family block comments.
- `stripDelimited(rawText, openLen, closeLen, hasClose)` strips a fixed-length open/close pair (quotes, or a
  heredoc/nowdoc's header/footer). `hasClose` must come from the scan itself (whether a real closing
  delimiter was actually found, vs. running off the end of the file) - it can't be inferred from `rawText`'s
  length alone, since a well-formed literal can end exactly at EOF.
- An `html` segment needs no transform at all (`rawText === text`) and is only emitted when non-empty (two
  adjacent PHP regions with nothing between them shouldn't produce a spurious empty `html` segment).
- A `code` segment likewise needs no transform - `emitCodeSegment` builds it straight from `content.slice(j,
t.range[0])` - and, the same way, is only emitted when that slice is non-empty (see the previous section).

### Escape handling

`skipEscape(content, i)` clamps a backslash-escape skip (`i + 2`) to `content.length`, so a trailing lone
backslash right at EOF (an unterminated string ending mid-escape) lands on the end of `content` instead of
one past it - without this, the emitted `range`/`map` can exceed `content.length`. See `parser.test.ts`'s
"unterminated literals ending in a trailing lone backslash" test.

## Tags

Same convention as every other package in this repo: a tag is a dot-separated hierarchical name, and every
segment carries its whole ancestor chain (`comment.block.doc` also carries `comment.block` and `comment`).
`html` and `code` are the two tags in this package that deliberately have no ancestor and aren't nested under
each other either - `html` isn't PHP code, and `code` isn't HTML, and neither is a kind of `string` or
`comment` - so both stand alone as siblings at the top level. See `README.md`'s [Tags](README.md#tags) table
for what each one means to a consumer.

`tags.ts` is the single place all of this is defined:

- Every individual tag object (`COMMENT_TAG`, `COMMENT_LINE_TAG`, ...) is a local, module-private constant,
  composed incrementally via spread the same way as every other package here (`COMMENT_LINE_TAG` spreads
  `COMMENT_TAG` rather than repeating `comment: true`). They're deliberately **not** exported individually -
  `scanner.ts` reaches every one of them through the single exported `TAGS` object (`TAGS.COMMENT_LINE`, ...)
  instead.
- `tagsAndMeaning` lists every tag with a one-line meaning. It's the source for both the README's Tags table
  (generated by `scripts/fix-parser-readme.ts`) and `tags`, the map from each tag to whether it's spell
  checked by default. `TagName` is derived from it, so a tag that isn't documented there fails to compile.
- `NOT_ON_BY_DEFAULT` is the short list of tags that are off by default: `code` and `html`.
- `tags` is load-bearing, not just descriptive: every filter, the default one included, is compiled against
  it. A tag `Scanner` emits that isn't a key in `tags` can't be filtered with `customizePlugin`'s `tags`
  option. `parser.test.ts`'s `tags` describe block is the regression test for this: it runs the raw `parse()`
  over every fixture and asserts every tag key it actually produces is a key in `parser.tags`.

### Why `code` and `html` are off by default

Both are `false` in `tags` (via `NOT_ON_BY_DEFAULT`), and `createPluginParserWithFilterTags` builds the
parser's default filter from `tags`, so the exported `parser`, `plugin`, and `recommended` skip them out of the
box. `parse()` still emits them, and a consumer turns them on with, for example,
`customizePlugin({ tags: { html: true } })`.

Every filter, a consumer's included, is compiled against the parser's unfiltered output and its `tags`, never
on top of an earlier filter. That's what lets a consumer turn `code` or `html` back on. The filtering happens
inside the parser before cspell sees the result, so it works with any cspell version. See the
plugin-customization ADRs (`docs/ADRs/plugin-customization/0006-tag-filtering.md`) for the design.

## Testing

- `parser.test.ts` reads fixtures out of `fixtures/` (via `readFixture`/`parseFixture` helpers) rather than
  embedding source strings inline - a fixture is real, syntactically valid PHP, which both exercises real
  file content and makes intent easier to read than an escaped string literal. `fixtures/` is excluded from
  `tsc`/ESLint/Prettier (see root `CLAUDE.md`) because a fixture's exact bytes are frequently what's being
  asserted on; don't let a formatter "fix" one. Even though `Scanner` itself now lives in `scanner.ts`, its
  test coverage stays in `parser.test.ts` - it's still the same parsing behavior being tested, just reached
  through `parse`/`parser.parse` rather than the `Scanner` class directly.
- `parseFixture(name, parse = parser.parse)` defaults to the default-filtered view (`code` and `html` excluded), which
  is what almost every test wants. The `mixed.php` block passes the unfiltered `parse` instead, since several
  of its tests specifically assert on `code`/`html` segments that the default filter would otherwise hide.
- Each non-obvious piece of scanning logic has its own dedicated fixture: `attributes.php` (`#[...]` vs. `#`
  comments), `close-tag.php` (`?>` ending PHP mode, including mid-line-comment), `short-echo.php` (`<?=`),
  `heredoc-nowdoc.php`, and `interpolation.php` (the nested-quote-inside-`{$...}` case) - in addition to
  `mixed.php` and `strings.php` for the more ordinary cases. When changing any of this logic, prefer adding
  to or extending one of these over inlining a one-off string in the test file itself.
- `parser.test.ts`'s `tags` describe block is the regression test for `tags.ts` staying in sync with what
  `Scanner` actually emits (see "Tags" above) - it collects every tag key produced across all of `fixtures/`
  and asserts each one is declared in `parser.tags`, plus a couple of direct assertions on `code`'s default.
- `samples/` is a real, separate end-to-end check: actual cspell configs plus real source files, run for real
  by `pnpm run test:cspell` (`cspell .` from the package root). The README's filtering examples are injected
  from these samples, so they're always tested:
  - `samples/doc-comments-only` proves the `customizePlugin` tag filter is doing something real: a genuine
    misspelling sits in a `//` comment the filter excludes. When changing filtering, sanity-check it by
    temporarily swapping in the plain `plugin` and confirming `cspell .` fails.
  - `samples/customize` turns on the `html` tag.

  Remember to `pnpm run build` first - `samples/` imports the package's built `dist/`, not `src/` directly,
  so a stale build will silently test old behavior.

<!-- cspell:ignore EOTHING -->
