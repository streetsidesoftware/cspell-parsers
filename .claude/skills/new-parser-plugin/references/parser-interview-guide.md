# Parser interview guide

The parser-specific decisions for a new parser plugin package, grouped by theme. Start with the `feature-adr`
interview guide's group 0 (why, stakeholders, and the goal), then pull from these. Ask one question, resolve
it, write it down (as an ADR if it's genuinely a judgment call, or fold it into another ADR's context if it's
a detail), then move to the next.

The `feature-adr` skill also uses groups 2–7 when a design changes an existing parser's behavior.

Where a question has an obvious, low-stakes default given the rest of the repo's conventions, propose that
default up front ("I'd default to X because the rest of the repo does Y — any reason to deviate here?")
rather than asking it as a fully open question.

## 1. Scope and template

- What language or file format is this, and what's the actual input? Give an example snippet of what should
  get spell checked and what shouldn't. This is usually the fastest way to pin down scope before it turns
  into edge-case debates later.
- Does an existing package already cover it, or come close? A new file type for an existing parser may be a
  change to that package instead (use the `feature-adr` skill for that).
- Which template? For a hand-written scanner, `packages/parser-typescript-strings-comments` (full-featured)
  or `packages/parser-example` (minimal starter), the two `CONTRIBUTING.md` names. For an AST-based parser,
  `packages/parser-typescript-tree-sitter-wasm` (tree-sitter, with no native dependency).
- One parser or several? One parser per language is the usual shape. Several parsers can share one scanner,
  as `parser-typescript-strings-comments` does. Either way, they live in `src/parsers.ts`, and the plugin is
  the only entry point.

## 2. File type coverage

- Which cspell/vscode language IDs belong in `supportedFileTypes`? Note this list is the single source of
  truth `recommended.ts` builds `languageSettings` from and what the README's "Supported file types" table
  is generated from — getting it right here avoids a second pass later.
- Are there closely related file types deliberately being left out for now (e.g. `.tsx` handled, `.mtsx`
  not)? Worth stating explicitly as context even if it doesn't rise to its own ADR.

## 3. Tags

Don't try to settle the full tag set in the interview. Tags emerge while building the parser. Settle only:

- Which families apply, from [`docs/tags.md`](../../../../docs/tags.md): usually `comment`, `string`, and
  `code`. Does the language have a kind of text no family covers yet?
- What should users be able to tell apart? For example, doc comments from plain ones, or raw strings from
  others. Show example code for each.
- What's off by default? Usually only `code`.

Every parser emits tags, so `src/tags.ts`, `customizePlugin`, and the README's tags table are always required.
Tag names are public API once released, so the build step reviews the final set against the conventions.

## 4. Backend / implementation strategy

- Hand-written scanner (regex/character-scan, generator-based `parsedTexts` per `CLAUDE.md`'s "Package
  shape" section) vs. AST-based (tree-sitter or similar)? `packages/parser-typescript-tree-sitter` (native
  `tree-sitter`) and `packages/parser-typescript` (which depends on
  `@cspell/parser-typescript-tree-sitter-wasm`) are the existing precedent for swapping backends behind the
  same package shape — is this feature adding a new backend option, or is a single approach sufficient?
- What are the candidate dependencies' licenses, including their own dependencies? Check them against
  `docs/dependency-licenses.md` before asking which backend to use, and show each option's license in the
  question. A license that would force our MIT license to change rules an option out unless the maintainers
  decide otherwise.
- If AST-based: what's the dependency cost? Check `CLAUDE.md`'s dist-size/production-dependency guidance —
  a new production dependency here is a real cost worth surfacing as a decision, not an implementation
  afterthought.
- If scanner-based: are `parsedTexts` ranges straightforward to compute relative to the original file
  content, or are there escaping/normalization edge cases (e.g. multi-byte characters, `\u2028`/`\u2029` per
  this repo's code-style rule on invisible characters) worth calling out in context?

## 5. Edge cases

Ask concretely, with example input, rather than abstractly ("how should nested comments behave?" is worse
than "given `/* outer /* inner */ still outer? */`, what should happen?"). Common categories worth checking
against this codebase's existing parsers:

- Malformed or partial input. A parser never throws: it may be given a fragment, such as a markdown code
  block, that starts or ends in the middle of a construct. The question is what the best-effort result is
  for an unterminated string or comment, an unmatched delimiter, or a fragment that starts inside a
  construct.
- Nesting and adjacency (comment inside string, string inside comment, back-to-back constructs)
- Leading/trailing content (front-matter blocks, BOM, trailing newline handling)
- Escape sequences and how they interact with word boundaries for spell-checking

## 6. Testing and samples

- Fixtures: what raw snippets belong in `fixtures/` to pin exact byte-level behavior (quote style, spacing)?
- Samples: which features, tags, and edge conditions get a sample of their own? Each sample demonstrates or
  exercises one thing, proving it works with cspell, and some also serve as README examples. Include
  `recommended/`, to prove it does what it should.

## 7. Release surface

- Is this a new publishable package (needs to be picked up by `fix-release-please-config`, i.e. its name
  doesn't start with `@internal`), or private/internal?
- Should the `parser-strings-comments` bundle include it? A strings-and-comments parser for a new language
  usually belongs there too.
- What's the package name, and the parser names? A package name has the form
  `@cspell/parser-<language>[-<specialization>]`, where the optional suffix is a specialization or the AST
  parser used, as in `@cspell/parser-php-strings-comments` or `@cspell/parser-typescript-tree-sitter`. Parser
  names are what users write in `languageSettings`, so they're public API from the first release.

## Wrapping a topic into a decision

Not every answered question needs its own ADR. Bundle related answers from the same group into one ADR when
they'd only make sense read together (e.g. the whole tag set from group 3 is usually one ADR); split them
when they're independently changeable later (backend choice and file-type coverage almost always warrant
separate ADRs, since one can change without the other).
