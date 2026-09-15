# @cspell/parser-example

Starter parser package for the cspell-parsers monorepo.

It implements cspell's [`Parser`](https://www.npmjs.com/package/@cspell/cspell-types) contract and exports a
[`Plugin`](https://www.npmjs.com/package/@cspell/cspell-types) so it can be wired into a cspell configuration.

The example parser extracts C-style comments - `//` line comments and `/*`-delimited block comments - out of
arbitrary source text, so only comment text (not code) gets spell checked, while keeping the reported offsets
relative to the original file. It skips over quoted string contents, so a comment marker inside a string
literal (`"see http://example.com"`) isn't mistaken for the start of a real comment.

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for a handful of C-style languages (C, C++, C#, Java, JavaScript, TypeScript):

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-example/recommended"],
}
```

For more control - for example, to apply it to only some file types, or alongside other settings - wire the
plugin in yourself and choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-example/plugin"],
  "languageSettings": [
    {
      "languageId": "c,cpp",
      "parser": "c-style-comments",
    },
  ],
}
```

## How it works

- `parser.parse(content, filename)` returns a `ParseResult` containing one or more `ParsedText` entries.
- Each `ParsedText.range` is the `[start, end]` offset of that segment in the original `content`, which is how
  cspell maps spelling issues found in the parsed text back to the right place in the source file.
- Each comment is tagged `{ comment: 'line' }` or `{ comment: 'block' }`, so tooling built on top of cspell
  can filter on what kind of segment it's looking at.
- `plugin.parsers` is the list of parsers a cspell plugin module exposes; a plugin can expose more than one.

Use this package as a template: copy `src/parser.ts`, `src/plugin.ts`, `src/index.ts`, and `src/recommended.ts`
into a new package under `packages/` and replace the parsing logic with your own. See the repo root
`CONTRIBUTING.md` for the full steps.
