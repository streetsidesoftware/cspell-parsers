| Tag                            | Meaning                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `string`                       | A string literal (fallback for a quote style that's neither `'` nor `"`)                     |
| `string.singleQuote`           | A `'...'` string literal                                                                     |
| `string.doubleQuote`           | A `"..."` string literal                                                                     |
| `string.templateLiteral`       | A literal text fragment of a template string (`` `...` ``), excluding `${...}` substitutions |
| `comment`                      | Any comment                                                                                  |
| `comment.line`                 | A `//` line comment                                                                          |
| `comment.block`                | A `/* ... */` block comment                                                                  |
| `comment.block.doc`            | A `/** ... */` doc comment                                                                   |
| `identifier`                   | Any identifier                                                                               |
| `identifier.variable`          | A variable name                                                                              |
| `identifier.property`          | An object or class property name                                                             |
| `identifier.privateProperty`   | A `#private` class property name                                                             |
| `identifier.type`              | A type name (only appears if TypeScript-only syntax shows up in a `.js`/`.jsx` file)         |
| `identifier.shorthandProperty` | A shorthand object property name (the `foo` in `{ foo }`)                                    |
| `identifier.label`             | A statement label                                                                            |
| `identifier.importBinding`     | A renamed import alias, default import name, or namespace import name                        |
| `identifier.exportBinding`     | A renamed export alias (`export { x as y }`)                                                 |
