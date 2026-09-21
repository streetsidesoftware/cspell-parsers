# Interview guide

A menu of the decision points that actually recur in this repo, grouped by theme. Pull from whichever
groups apply to the feature at hand — most features only touch two or three of these. Ask one question,
resolve it, write it down (as an ADR if it's genuinely a judgment call, or fold it into another ADR's
context if it's a detail), then move to the next.

Where a question has an obvious, low-stakes default given the rest of the repo's conventions, it's fine to
propose that default up front ("I'd default to X because the rest of the repo does Y — any reason to
deviate here?") rather than asking it as a fully open question. That's still a decision worth an ADR if the
user could reasonably have picked differently; it just makes the interview faster.

## 1. Shape of the change

- Is this a brand-new parser package, a behavior change to an existing one, or something cross-cutting
  (touches `@internal/utils`, affects multiple packages at once)? This determines which of the groups below
  even apply.
- If new: does `packages/parser-typescript` (full-featured) or `packages/parser-example` (minimal starter)
  make the better starting template, per `CONTRIBUTING.md`?
- What's the actual input this parses, and what's out of scope? Concretely: give an example snippet of what
  should get spell-checked and what shouldn't — this is usually the fastest way to pin down scope
  disagreements before they turn into edge-case debates later.

## 2. File type coverage

- Which cspell/vscode language IDs belong in `supportedFileTypes`? Note this list is the single source of
  truth `recommended.ts` builds `languageSettings` from and what the README's "Supported file types" table
  is generated from — getting it right here avoids a second pass later.
- Are there closely related file types deliberately being left out for now (e.g. `.tsx` handled, `.mtsx`
  not)? Worth stating explicitly as context even if it doesn't rise to its own ADR.

## 3. Tags (only if this parser emits `tags`)

- What's the full tag set, and which tags are hierarchical (dot-separated, e.g. `comment.block.doc`)? Per
  `CONTRIBUTING.md`'s tags convention, every ancestor tag must be emitted alongside the most specific one.
- Is the tag naming consistent with sibling packages that tag similar constructs (check
  `packages/parser-typescript/src/tags.ts` and any `*-strings-comments` package for precedent) — reusing an
  existing tag name is usually preferable to minting a near-duplicate. `parser-javascript` reusing
  `parser-typescript`'s tags (see commit history) is the precedent for this.
- Since tags become part of the package's effective public API the moment someone writes a
  `customizePlugin({ tags: ... })` filter against them, treat a tag rename later as a breaking change when
  deciding names now.
- Does `plugin.ts` need to export `customizePlugin`/`CustomizePluginOptions` (required whenever `tags` are
  emitted at all — see `CLAUDE.md`'s "Package shape")?

## 4. Backend / implementation strategy

- Hand-written scanner (regex/character-scan, generator-based `parsedTexts` per
  `feedback_generator_based_parsedtexts`) vs. AST-based (tree-sitter or similar)? This is exactly the kind
  of decision `parser-typescript`'s multiple backends (tree-sitter, tree-sitter-wasm, and others planned per
  the multi-backend project) were built to make swappable — is this feature adding a new backend option, or
  is a single approach sufficient?
- If AST-based: what's the dependency cost? Check `CLAUDE.md`'s dist-size/production-dependency guidance —
  a new production dependency here is a real cost worth surfacing as a decision, not an implementation
  afterthought.
- If scanner-based: are `parsedTexts` ranges straightforward to compute relative to the original file
  content, or are there escaping/normalization edge cases (e.g. multi-byte characters, ` `/` ` per
  this repo's code-style rule on invisible characters) worth calling out in context?

## 5. Edge cases

Ask concretely, with example input, rather than abstractly ("how should nested comments behave?" is worse
than "given `/* outer /* inner */ still outer? */`, what should happen?"). Common categories worth checking
against this codebase's existing parsers:
- Malformed/incomplete input (unterminated string, unterminated comment) — error out, or best-effort parse?
- Nesting and adjacency (comment inside string, string inside comment, back-to-back constructs)
- Leading/trailing content (front-matter blocks, BOM, trailing newline handling)
- Escape sequences and how they interact with word boundaries for spell-checking

## 6. Testing and samples

- Fixtures: what raw snippets belong in `fixtures/` to pin exact byte-level behavior (quote style, spacing)?
- Samples: does this warrant a new `samples/<pattern>/` subfolder (e.g. a new usage pattern beyond the
  existing `plugin`/`recommended` split), or do the existing sample patterns already cover it?

## 7. Release surface

- Is this a new publishable package (needs to be picked up by `fix-release-please-config`, i.e. its name
  doesn't start with `@internal`), or private/internal?
- Does the README need a new tags table and/or "Filtering by tag" section (required whenever `tags` are
  emitted — see `CLAUDE.md`)?

## Wrapping a topic into a decision

Not every answered question needs its own ADR. Bundle related answers from the same group into one ADR when
they'd only make sense read together (e.g. the whole tag set from group 3 is usually one ADR); split them
when they're independently changeable later (backend choice and file-type coverage almost always warrant
separate ADRs, since one can change without the other).
