import { codeTagMeaning } from '@internal/utils';

/**
 * Every tag this parser can emit, and what each one means. Source of truth for both `tags` below and
 * `README.md`'s Tags table, which is generated from this object (`scripts/fix-parser-readme.ts`).
 */
export const tagsAndMeaning = {
  comment: 'Any comment',
  'comment.line': 'A `//` line comment',
  'comment.line.doc': 'A `///` XML doc comment line (not a `////`-or-more separator line)',
  'comment.block': 'A `/* ... */` block comment',
  'comment.block.doc': 'A `/** ... */` doc-style block comment (not a conventional C# form, but handled)',
  string: 'Any string-like literal',
  'string.singleQuote': "A `'...'` character literal",
  'string.doubleQuote': 'A `"..."` string literal',
  'string.verbatim': 'A `@"..."` verbatim string literal',
  'string.interpolated': 'A `$"..."` interpolated string literal fragment',
  'string.raw': 'A C# 11 `"""..."""` raw string literal',
  code: codeTagMeaning,
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
const COMMENT_LINE_DOC_TAG: Tags = defineTag({ ...COMMENT_LINE_TAG, 'comment.line.doc': true });
const COMMENT_BLOCK_TAG: Tags = defineTag({ ...COMMENT_TAG, 'comment.block': true });
const COMMENT_BLOCK_DOC_TAG: Tags = defineTag({ ...COMMENT_BLOCK_TAG, 'comment.block.doc': true });

const STRING_TAG: Tags = defineTag({ string: true });
const STRING_SINGLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.singleQuote': true });
const STRING_DOUBLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.doubleQuote': true });
const STRING_VERBATIM_TAG: Tags = defineTag({ ...STRING_TAG, 'string.verbatim': true });
const STRING_INTERPOLATED_TAG: Tags = defineTag({ ...STRING_TAG, 'string.interpolated': true });
const STRING_VERBATIM_INTERPOLATED_TAG: Tags = defineTag({
  ...STRING_TAG,
  'string.verbatim': true,
  'string.interpolated': true,
});
const STRING_RAW_TAG: Tags = defineTag({ ...STRING_TAG, 'string.raw': true });
const STRING_RAW_INTERPOLATED_TAG: Tags = defineTag({
  ...STRING_TAG,
  'string.raw': true,
  'string.interpolated': true,
});

/** Identifiers, keywords, punctuation, numbers, and preprocessor directives - everything not a comment or string. */
const CODE_TAG: Tags = defineTag({ code: true });

export const TAGS = {
  COMMENT: COMMENT_TAG,
  COMMENT_LINE: COMMENT_LINE_TAG,
  COMMENT_LINE_DOC: COMMENT_LINE_DOC_TAG,
  COMMENT_BLOCK: COMMENT_BLOCK_TAG,
  COMMENT_BLOCK_DOC: COMMENT_BLOCK_DOC_TAG,
  STRING: STRING_TAG,
  STRING_SINGLE: STRING_SINGLE_TAG,
  STRING_DOUBLE: STRING_DOUBLE_TAG,
  STRING_VERBATIM: STRING_VERBATIM_TAG,
  STRING_INTERPOLATED: STRING_INTERPOLATED_TAG,
  STRING_VERBATIM_INTERPOLATED: STRING_VERBATIM_INTERPOLATED_TAG,
  STRING_RAW: STRING_RAW_TAG,
  STRING_RAW_INTERPOLATED: STRING_RAW_INTERPOLATED_TAG,
  CODE: CODE_TAG,
} as const;
