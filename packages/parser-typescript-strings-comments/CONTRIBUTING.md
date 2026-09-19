# Contributing to @cspell/parser-typescript-strings-comments

Contributor-facing notes on `src/parser.ts`. See the repo root `CONTRIBUTING.md` for the general package
shape (`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `fixtures/`, `samples/`).

## Shape

`Scanner` is a single hand-written scanner (no AST, no tokenizer) - `scanCode` walks `content`
character-by-character, recognizing only comments and strings and silently skipping everything else, the
same approach `@cspell/parser-example` uses.

This package was split out of `@cspell/parser-strings-comments`, which also covered C, C++, C#, Go, Java,
and PHP behind `Dialect` branching. Removing that branching (this package only ever handles one syntax
family) is most of why `scanCode` is about half the size.

`scanCode(end, stopAtUnmatchedBrace)` is also called recursively for a template literal's `${...}`
interpolation hole, which has no known end index up front - only "the matching `}`". This is why a
string/comment nested inside an interpolation gets scanned and tagged exactly like top-level code.

## Regex vs. division, and module specifiers

The reasoning for the regex-literal-vs-division heuristic (`isDivisionContext`, `tryScanRegexLiteral`,
`canPrecedeString`/`sawSlash`) and for module-specifier detection (`isModuleSpecifierContext`) is documented
in-line in `parser.ts` rather than repeated here - start at those functions' doc comments.

Worth knowing before touching any of it: `parser.test.ts` has regression tests for the trickiest cases (a
same-line `}` that must resolve as division, `sawSlash`'s stickiness, a quote surviving inside an
unrecognized regex). Each one documents, in its own comment, exactly what silently breaks if you "simplify"
the code it's guarding - read those before changing the heuristics.

## Escape handling

`skipEscape` clamps a backslash-escape skip to `content.length`, so a trailing lone backslash at EOF doesn't
push a `range`/`map` past the end of `content`. This was a real bug, caught by Copilot's review of
`@cspell/parser-strings-comments` PR #60 before this package was split out - see `parser.test.ts`'s
"unterminated literals ending in a trailing lone backslash".

## Testing

- `parser.test.ts` reads fixtures from `fixtures/` rather than inlining source strings. `fixtures/` is
  excluded from tsc/ESLint/Prettier - a fixture's exact bytes are often what's being asserted on.
- `samples/` is a real end-to-end check, run via `pnpm run test:cspell`. `samples/customize` proves the
  `customizePlugin` tag filter actually excludes a misspelling, not just that it type-checks.
