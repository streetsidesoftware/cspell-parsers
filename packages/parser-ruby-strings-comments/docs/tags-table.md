| Tag                  | Meaning                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `comment`            | Any comment                                                              |
| `comment.line`       | A `#` line comment                                                       |
| `comment.block`      | An `=begin` ... `=end` block comment                                     |
| `string`             | Any string-like literal                                                  |
| `string.singleQuote` | A `'...'` string literal                                                 |
| `string.doubleQuote` | A `"..."` string literal (including interpolated fragments)              |
| `string.heredoc`     | A `<<~ID`/`<<-ID`/`<<ID` heredoc body (any of its fragments)             |
| `string.backtick`    | A `` `...` `` backtick command string (including interpolated fragments) |
| `code`               | Everything else (off by default)                                         |
