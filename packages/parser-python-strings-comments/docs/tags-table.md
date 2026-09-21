| Tag                   | Meaning                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `comment`             | Any comment                                                                        |
| `comment.line`        | A `#` line comment                                                                 |
| `string`              | Any string-like literal                                                            |
| `string.singleQuote`  | A `'...'` string literal                                                           |
| `string.doubleQuote`  | A `"..."` string literal                                                           |
| `string.tripleQuote`  | A `'''...'''` or `"""..."""` string literal                                        |
| `string.raw`          | Any `r`-prefixed string (`r`, `rb`/`br`, `rf`/`fr`) - composes with the tags above |
| `string.interpolated` | Any `f`-prefixed string (an f-string) - composes with the tags above               |
