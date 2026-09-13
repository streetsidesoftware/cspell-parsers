# @cspell/parser-example

Starter parser package for the cspell-parsers monorepo.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

The example parser strips a leading YAML front-matter block (delimited by `---` lines) out of the text that
gets spell checked, while keeping the reported offsets relative to the original file.

## Usage

Reference the package from a cspell configuration's `plugins` list and select its parser by name:

```jsonc
{
  "plugins": ["@cspell/parser-example"],
  "parser": "front-matter-example",
}
```

## How it works

- `parser.parse(content, filename)` returns a `ParseResult` containing one or more `ParsedText` entries.
- Each `ParsedText.range` is the `[start, end]` offset of that segment in the original `content`, which is how
  cspell maps spelling issues found in the parsed text back to the right place in the source file.
- `plugin.parsers` is the list of parsers a cspell plugin module exposes; a plugin can expose more than one.

Use this package as a template: copy `src/index.ts` and `src/index.test.ts` into a new package under
`packages/` and replace the parsing logic with your own.
