| Tag                  | Meaning                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `comment`            | Any comment                                                                                   |
| `comment.line`       | A `//` line comment                                                                           |
| `comment.block`      | A `/* ... */` block comment                                                                   |
| `comment.block.doc`  | A `/** ... */` doc comment (rare in idiomatic Go, which favors plain `//` comments for godoc) |
| `string`             | Any string-like literal                                                                       |
| `string.singleQuote` | A `'...'` rune literal                                                                        |
| `string.doubleQuote` | A `"..."` interpreted string literal                                                          |
| `string.raw`         | A `` `...` `` raw string literal                                                              |
| `code`               | Everything else (off by default)                                                              |
