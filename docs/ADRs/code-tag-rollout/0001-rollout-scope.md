# 0001. Rollout scope: which packages get a `code` tag

Status: Accepted

## Context

`parser-php-strings-comments` is the only package with a `code` catch-all tag today. The rest of the
`packages/*` tree splits into three shapes:

- Hand-written scanners with their own `tags.ts`, structurally identical to PHP's: `parser-c-cpp-strings-comments`,
  `parser-csharp-strings-comments`, `parser-go-strings-comments`, `parser-java-strings-comments`,
  `parser-python-strings-comments`, `parser-ruby-strings-comments`, `parser-rust-strings-comments`,
  `parser-typescript-strings-comments`. The PHP pattern (scanner emits `code` inline for whatever it isn't
  already yielding as `comment`/`string`/`html`) is the model, though the actual gap-filling mechanics end up
  shared across every package in this rollout rather than reimplemented per scanner — see
  [0004](./0004-shared-fillcodegaps-helper.md).
- AST-based tree-sitter backends, `parser-typescript-tree-sitter` and `parser-typescript-tree-sitter-wasm`,
  which walk a real syntax tree rather than scanning character-by-character. These already tag comments,
  strings, and identifiers, but currently emit nothing at all for keywords, punctuation, operators, or
  numeric literals — not mistagged, just absent from `parsedTexts` entirely. "Catch-all" here means
  something different from the scanner case (see 0003), so it's a separate implementation, not a straight
  port.
- Thin aliases with no scanning/walking logic of their own: `parser-typescript` and `parser-javascript`
  re-export `parse`/`tags` from `parser-typescript-tree-sitter-wasm`, and `parser-strings-comments` bundles
  the other packages' plugins. These need no changes — they inherit whatever their underlying package does.
- `parser-example`: CLAUDE.md describes it as a deliberately minimal single-file reference, predating the
  current package-shape convention, "fine to start from for a trivial parser" but only obligated to match
  the full shape (`tags`/`scope`/`recommended`) if it *needs* to. It currently emits only `comment` tags, no
  `string` tag at all.

## Decision

We will add a `code` catch-all tag to all 8 scanner-based `*-strings-comments` packages, both tree-sitter
backends (`parser-typescript-tree-sitter`, `parser-typescript-tree-sitter-wasm`), and `parser-example`.
`parser-typescript`, `parser-javascript`, and `parser-strings-comments` need no direct changes since they
inherit from the packages above.

`parser-example` gets a real `code`/`string` split (not just a tag rename) so it stays a faithful minimal
reference of the current convention, rather than falling further behind the shape every other package now
follows.

## Consequences

- 11 packages get touched: 8 scanners, 2 tree-sitter backends, and `parser-example`. Each is implemented in
  its own worktree off latest `main` (see the parent task), since the changes are independent per package.
- `parser-example` needs new string-literal scanning logic it doesn't have today (to have something for
  `code` to be a catch-all *against*), which is a bigger change to that package than the tag rollout is to
  any of the others — call this out explicitly when implementing it, since it's not "just add a tag" there.
- `parser-typescript`/`parser-javascript` will start emitting `code` automatically once
  `parser-typescript-tree-sitter-wasm` does, with no changes to those alias packages themselves — but their
  README/tags table generation (`scripts/fix-tags-readme.ts`) still needs to be re-run so the inherited tag
  shows up in their docs too.
