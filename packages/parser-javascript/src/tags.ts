/**
 * Every tag this parser can emit, and what each one means. Source of truth for both `tags` below and
 * `README.md`'s Tags table, which is generated from this object (`scripts/fix-tags-readme.ts`).
 *
 * `parse` is reused from `@cspell/parser-typescript`, whose own tag surface also includes
 * `module`/`module.specifier`/`module.specifier.literal` and `.module`-suffixed string tags - deliberately
 * left out here, matching this package's existing, narrower public tag list.
 */
export const tagsAndMeaning = {
  string: "A string literal (fallback for a quote style that's neither `'` nor `\"`)",
  'string.singleQuote': "A `'...'` string literal",
  'string.doubleQuote': 'A `"..."` string literal',
  'string.templateLiteral':
    'A literal text fragment of a template string (`` `...` ``), excluding `${...}` substitutions',
  comment: 'Any comment',
  'comment.line': 'A `//` line comment',
  'comment.block': 'A `/* ... */` block comment',
  'comment.block.doc': 'A `/** ... */` doc comment',
  identifier: 'Any identifier',
  'identifier.variable': 'A variable name',
  'identifier.property': 'An object or class property name',
  'identifier.privateProperty': 'A `#private` class property name',
  'identifier.type': 'A type name (only appears if TypeScript-only syntax shows up in a `.js`/`.jsx` file)',
  'identifier.shorthandProperty': 'A shorthand object property name (the `foo` in `{ foo }`)',
  'identifier.label': 'A statement label',
  'identifier.importBinding': 'A renamed import alias, default import name, or namespace import name',
  'identifier.exportBinding': 'A renamed export alias (`export { x as y }`)',
} as const satisfies Record<string, string>;

export type TagName = keyof typeof tagsAndMeaning;

export const tags: Readonly<Record<TagName, boolean>> = Object.freeze(
  Object.fromEntries(Object.keys(tagsAndMeaning).map((tag) => [tag, true])),
) as Readonly<Record<TagName, boolean>>;
