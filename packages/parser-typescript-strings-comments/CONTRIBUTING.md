# Contributing to @cspell/parser-typescript-strings-comments

Contributor-facing notes on the scanner in `src/scanner.ts`. `src/parsers.ts` wraps it in two parsers that share
it: `javascript-strings-comments` for JavaScript and JSX, and `typescript-strings-comments` for TypeScript and
TSX. The scanner doesn't look at the file type, so both give the same result. See the repo root
`CONTRIBUTING.md` for the general package shape (`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`,
`samples/`).

## Using this package as a template

Like every parser package, this one keeps its parsers in `src/parsers.ts`, which exports the raw `parse` and a
`parsers` array. This package has two parsers; most have one, as `@cspell/parser-csharp-strings-comments`
does. To add a new parser for another language, copy `src/parsers.ts`, `src/plugin.ts`, `src/index.ts`,
`src/recommended.ts`, and `src/tags.ts` into a new package under `packages/`. Then replace `src/scanner.ts`
with your own parsing logic, and `src/tags.ts` with the tags it emits. A parser's default filter comes only
from `tags`, so set a tag to `false` there to leave it unchecked by default. See the repo root
`CONTRIBUTING.md` for the full steps.

## Shape

`Scanner` is a single hand-written scanner (no AST, no tokenizer) - `scanCode` walks `content`
character-by-character, recognizing only comments and strings and silently skipping everything else, the
same approach `@cspell/parser-example` uses.

`scanCode(end, stopAtUnmatchedBrace)` is also called recursively for a template literal's `${...}`
expression, which has no known end index up front - only "the matching `}`". This is why a
string/comment nested inside an interpolation gets scanned and tagged exactly like top-level code.

## Regex vs. division, and module specifiers

This is a hand-written scanner, not a real grammar, so it resolves the regex-vs-division ambiguity
(`/pattern/` vs. `a / b`) with a heuristic - looking at the significant character right before the `/`, the
same way a JS tokenizer does - rather than full expression tracking. It correctly recognizes a regex literal
in the overwhelming majority of real code, including a quote character anywhere in its body (`/don't/`,
`/[\w"']/`), except `/['"]/` right after an array literal's bracket, which is genuinely ambiguous with a real
string and can't be resolved from the characters alone. Failures are deliberately biased toward "division,"
the safer failure mode: getting it wrong there just means a regex literal is scanned as ordinary code instead
of being skipped as an opaque unit (see `README.md`'s "Known limitations" for the user-visible effect).

The full reasoning for the heuristic (`isDivisionContext`, `tryScanRegexLiteral`, `canPrecedeString`/
`sawSlash`) and for module-specifier detection (`isModuleSpecifierContext`) is documented in-line in
`scanner.ts` rather than repeated here - start at those functions' doc comments.

Worth knowing before touching any of it: `parsers.test.ts` has regression tests for the trickiest cases (a
same-line `}` that must resolve as division, `sawSlash`'s stickiness, a quote surviving inside an
unrecognized regex). Each one documents, in its own comment, exactly what silently breaks if you "simplify"
the code it's guarding - read those before changing the heuristics.

## Escape handling

`skipEscape` clamps a backslash-escape skip to `content.length`, so a trailing lone backslash at EOF doesn't
push a `range`/`map` past the end of `content`. See `parsers.test.ts`'s "unterminated literals ending in a
trailing lone backslash".

## Testing

- `parsers.test.ts` reads fixtures from `fixtures/` rather than inlining source strings. `fixtures/` is
  excluded from tsc/ESLint/Prettier - a fixture's exact bytes are often what's being asserted on.
- `samples/` is a real end-to-end check, run via `pnpm run test:cspell`. The README's customization
  examples are injected from these samples, so they're always tested:
  - `samples/customize` proves the `customizePlugin` tag filter actually excludes a misspelling, not just
    that it type-checks.
  - `samples/customize-by-file-type` does the same for `javascript-strings-comments`, filtered by name to
    check only comments in JavaScript and JSX files.
  - `samples/check-code` turns on the `code` tag.
