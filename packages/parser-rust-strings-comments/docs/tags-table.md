| Tag                 | Meaning                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `comment`           | Any comment                                                                   |
| `comment.line`      | A `//` line comment                                                           |
| `comment.line.doc`  | A `///` outer doc comment or `//!` inner doc comment line                     |
| `comment.block`     | A `/* ... */` block comment (including a nested one)                          |
| `comment.block.doc` | A `/** ... */` outer doc block or `/*! ... */` inner doc block                |
| `string`            | Any string-like literal, including a plain `"..."` string                     |
| `string.byte`       | A `b"..."` byte string literal (also carried by `string.byte.raw`)            |
| `string.raw`        | A raw string literal (`r"..."`, `r#"..."#`, ...) - not a byte or C raw string |
| `string.byte.raw`   | A byte raw string literal (`br"..."`, `br#"..."#`, ...)                       |
| `string.c`          | A `c"..."` C string literal (also carried by `string.c.raw`)                  |
| `string.c.raw`      | A C raw string literal (`cr"..."`, `cr#"..."#`, ...)                          |
| `code`              | Everything else (off by default)                                              |
