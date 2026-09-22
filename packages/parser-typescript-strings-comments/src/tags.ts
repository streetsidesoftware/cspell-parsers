/**
 * Every tag this parser can emit, and what each one means. Source of truth for both `tags` below and
 * `README.md`'s Tags table, which is generated from this object (`scripts/fix-tags-readme.ts`).
 */
export const tagsAndMeaning = {
  comment: 'Any comment',
  'comment.line': 'A `//` line comment',
  'comment.block': 'A `/* ... */` block comment',
  'comment.block.doc': 'A `/** ... */` doc comment (JSDoc-style)',
  string: 'Any string-like literal',
  'string.singleQuote': "A `'...'` string literal",
  'string.doubleQuote': 'A `"..."` string literal',
  'string.singleQuote.module': "A `'...'` string literal that is also a module specifier",
  'string.doubleQuote.module': 'A `"..."` string literal that is also a module specifier',
  'string.templateLiteral': 'A literal text fragment of a template string (`` `...` ``), excluding `${...}` holes',
  module: 'Any module specifier string',
  'module.specifier': 'Any module specifier string (same as `module`, for a more specific filter)',
  'module.specifier.literal':
    "The module specifier string of an `import`/`export ... from` statement, a dynamic `import('...')`, or a `require(...)` call",
  code: 'Everything else (off by default)',
} as const satisfies Record<string, string>;

export type TagName = keyof typeof tagsAndMeaning;
type AllTags = Record<TagName, boolean>;

/** Keyed by `tagsAndMeaning` rather than the wide-open `ParsedTags`, so an undocumented key fails to compile. */
export type Tags = Partial<AllTags>;

/**
 * Constructs a `Tags` value; unlike a bare `Object.freeze({...})`, its non-generic parameter type gets
 * excess-property-checked, so an undocumented key is a compile error.
 */
function defineTag(tag: Tags): Readonly<Tags> {
  return Object.freeze(tag);
}

/** Tags excluded from "spell checked by default". `code` is the one tag consumers must opt into. */
const NOT_ON_BY_DEFAULT: ReadonlySet<TagName> = new Set(['code']);

export const tags: Readonly<AllTags> = Object.freeze(
  Object.fromEntries(Object.keys(tagsAndMeaning).map((tag) => [tag, !NOT_ON_BY_DEFAULT.has(tag as TagName)])),
) as Readonly<AllTags>;

const COMMENT_TAG: Tags = defineTag({ comment: true });
const COMMENT_LINE_TAG: Tags = defineTag({ ...COMMENT_TAG, 'comment.line': true });
const COMMENT_BLOCK_TAG: Tags = defineTag({ ...COMMENT_TAG, 'comment.block': true });
const COMMENT_BLOCK_DOC_TAG: Tags = defineTag({ ...COMMENT_BLOCK_TAG, 'comment.block.doc': true });

const STRING_TAG: Tags = defineTag({ string: true });
const STRING_SINGLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.singleQuote': true });
const STRING_DOUBLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.doubleQuote': true });
const STRING_TEMPLATE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.templateLiteral': true });

/**
 * A module specifier string additionally gets the whole `module`/`module.specifier`/
 * `module.specifier.literal` chain, plus `.module` appended to its own quote-style tag - the same
 * convention `@cspell/parser-typescript` uses - so a consumer can filter module specifiers out with
 * `customizePlugin` independently of ordinary string literals, without losing the plain `string`/
 * `string.singleQuote`/`string.doubleQuote` tags.
 */
const MODULE_SPECIFIER_LITERAL_TAG: Tags = defineTag({
  module: true,
  'module.specifier': true,
  'module.specifier.literal': true,
});
const STRING_SINGLE_MODULE_TAG: Tags = defineTag({
  ...STRING_SINGLE_TAG,
  'string.singleQuote.module': true,
  ...MODULE_SPECIFIER_LITERAL_TAG,
});
const STRING_DOUBLE_MODULE_TAG: Tags = defineTag({
  ...STRING_DOUBLE_TAG,
  'string.doubleQuote.module': true,
  ...MODULE_SPECIFIER_LITERAL_TAG,
});

/** Identifiers, keywords, punctuation, numbers, and non-module-specifier code - everything not a comment or string. */
const CODE_TAG: Tags = defineTag({ code: true });

export const TAGS = {
  COMMENT: COMMENT_TAG,
  COMMENT_LINE: COMMENT_LINE_TAG,
  COMMENT_BLOCK: COMMENT_BLOCK_TAG,
  COMMENT_BLOCK_DOC: COMMENT_BLOCK_DOC_TAG,
  STRING: STRING_TAG,
  STRING_SINGLE: STRING_SINGLE_TAG,
  STRING_DOUBLE: STRING_DOUBLE_TAG,
  STRING_TEMPLATE: STRING_TEMPLATE_TAG,
  STRING_SINGLE_MODULE: STRING_SINGLE_MODULE_TAG,
  STRING_DOUBLE_MODULE: STRING_DOUBLE_MODULE_TAG,
  CODE: CODE_TAG,
} as const;
