# @cspell/parser-typescript

A [cspell](https://cspell.org) parser plugin for TypeScript (`.ts`, `.mts`, `.cts`) and TSX/JSX (`.tsx`,
`.jsx`) source files. It understands the language well enough to skip things that were never meant to be
read as words — keywords, punctuation, numeric literals — and to leave import specifiers, external package
names, and property access on imported values alone, so it produces fewer false positives than plain
text-based checking.

## Install

```sh
npm install --save-dev @cspell/parser-typescript
```

## Usage

The quickest way to get started is to import the recommended settings, which registers the plugin and
selects it for TypeScript, JavaScript, TSX, and JSX files:

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-typescript/recommended"],
}
```

For more control — for example, to apply it to only some file types, or alongside other settings — wire the
plugin in yourself and choose the language IDs to use it for:

```jsonc
{
  "plugins": ["@cspell/parser-typescript/plugin"],
  "languageSettings": [
    {
      "languageId": "typescript,typescriptreact",
      "parser": "typescript",
    },
  ],
}
```

## What it does differently

- Only checks identifiers, string/template contents, comments, and JSX text — never keywords, punctuation,
  or numbers.
- Doesn't flag a package name in an `import`/`export ... from` (`'lodash'`, `'@scope/pkg'`, `'node:fs'`) —
  that's not spelling you authored.
- Doesn't flag a named import's original export name, or properties accessed on an imported value —
  those come from the package being imported, not from your code. A renamed import's local alias, since you
  chose that name, _is_ checked.
- Still checks a local variable or parameter that happens to reuse an import's name, for the scope where it
  shadows that import.
- Tags each checked segment with what kind of thing it is (a single-quoted string, a comment, a variable
  name, ...) and a scope describing what construct it's nested in, for any tooling built on top of cspell
  that wants that structure.

## Notes

- Ships a native addon (via `tree-sitter`); prebuilt binaries are used automatically on common platforms, so
  no local compiler toolchain should be needed to install it.
