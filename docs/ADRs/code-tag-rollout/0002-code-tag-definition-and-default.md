# 0002. `code` tag definition and default-off convention (scanner packages)

Status: Accepted

## Context

For the 8 scanner-based `*-strings-comments` packages (plus `parser-example`, once it grows a `string`
tag), `parser-php-strings-comments/src/tags.ts` already establishes a working pattern:

```ts
code: "PHP code that isn't a comment or string (identifiers, keywords, punctuation, numbers, tag delimiters)",
...
const NOT_ON_BY_DEFAULT: ReadonlySet<TagName> = new Set(['code']);
...
const CODE_TAG: Tags = defineTag({ code: true });
```

`code` is a flat, top-level tag (no `code.*` children), a sibling to `comment`/`string`/`html`, not nested
under any of them. `tags` (the "on by default" map used when a consumer doesn't customize anything) marks
every tag `true` except whatever's in `NOT_ON_BY_DEFAULT`.

The open questions were: (1) should the tag key, flatness, and default-off behavior be identical across
every package, or does it make sense to vary per language (e.g. off by default only for noisier languages);
and (2) how should each package's one-line meaning string be worded.

## Decision

Every scanner package uses the exact same tag key `code`, the same flat (non-hierarchical) shape, and the
same `NOT_ON_BY_DEFAULT: ReadonlySet<TagName> = new Set(['code'])` convention — `code` is off by default
everywhere, with no per-package exceptions. Each package's `tagsAndMeaning.code` entry follows PHP's
wording pattern, substituted for that language's own terms and constructs, e.g.:

- `parser-c-cpp-strings-comments`: `"C/C++ code that isn't a comment or string (identifiers, keywords, punctuation, numbers, preprocessor tokens)"`
- `parser-rust-strings-comments`: `"Rust code that isn't a comment or string (identifiers, keywords, punctuation, numbers, attributes)"`
- and so on, adapted per package's actual scanned constructs (checked against each package's own
  `tagsAndMeaning` for what other constructs already exist to reference).

Each package's `CODE_TAG` constant is `defineTag({ code: true })`, added to that package's `TAGS` export as
`CODE: CODE_TAG`. **Superseded by [0004](./0004-shared-code-tags-emitter.md):** rather than each scanner
threading its own copy of PHP's inline `j`-cursor/`emitCodeSegment` pattern, every package in this rollout
(scanner-based and tree-sitter-based alike) pipes its scan/walk generator through one shared
`createCodeTagsEmitter` helper in `@internal/utils` instead — see 0004 for why and for the resulting
`Scanner.run()` shape.

## Consequences

- A consumer's `customizePlugin({ tags: { code: false } })` (or `{ '*': false, code: true }` to see only
  code) now behaves identically regardless of which of these packages they're using — no per-language
  surprises.
- Every touched package's README needs a "Filtering by tag" section update (if it doesn't already have
  one) and its tags table regenerated via `scripts/fix-tags-readme.ts`, per `CLAUDE.md`'s README
  conventions for any package that emits `tags`.
- `code` becoming part of each package's public tag surface is a compatibility commitment per
  `CLAUDE.md`/`CONTRIBUTING.md`'s tags convention — renaming it later would be a breaking change for anyone
  who's written a `customizePlugin` filter referencing it.
