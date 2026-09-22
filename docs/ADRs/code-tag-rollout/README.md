# Code tag rollout

`parser-php-strings-comments` introduced a catch-all `code` tag — off by default — for any segment not
already covered by a more specific tag. This feature extends that same tag to the rest of the parser
packages. Because those packages split between hand-written scanners (which can port the PHP pattern
directly) and AST-based tree-sitter backends (where "catch-all" has to be computed from range gaps rather
than scanned inline), several decisions needed pinning down before implementation.

## Decisions

| #    | Title                                                          | Status   |
| ---- | --------------------------------------------------------------- | -------- |
| 0001 | Rollout scope: which packages get a `code` tag                | Accepted |
| 0002 | `code` tag definition and default-off convention (scanners)   | Accepted |
| 0003 | Tree-sitter `code` tag semantics (range-gap catch-all)         | Accepted |
| 0004 | Shared `fillCodeGaps` helper in `@internal/utils`              | Accepted |
