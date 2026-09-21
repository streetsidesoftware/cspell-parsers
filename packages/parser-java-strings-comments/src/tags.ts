/**
 * Every tag this parser can emit, and what each one means. Source of truth for both `tags` below and
 * `README.md`'s Tags table, which is generated from this object (`scripts/fix-tags-readme.ts`).
 */
export const tagsAndMeaning = {
  comment: 'Any comment',
  'comment.line': 'A `//` line comment',
  'comment.block': 'A `/* ... */` block comment',
  'comment.block.doc': 'A `/** ... */` Javadoc comment',
  string: 'Any string-like literal',
  'string.singleQuote': "A `'...'` character literal",
  'string.doubleQuote': 'A `"..."` string literal',
  'string.textBlock': 'A `"""..."""` text block (Java 15+)',
} as const satisfies Record<string, string>;

export type TagName = keyof typeof tagsAndMeaning;
type AllTags = Record<TagName, boolean>;

/** Keyed by `tagsAndMeaning` rather than the wide-open `ParsedTags`, so an undocumented key fails to compile. */
export type Tags = Partial<AllTags>;

/** Constructs a `Tags` value; unlike a bare `Object.freeze({...})`, its non-generic parameter type gets excess-property-checked, so an undocumented key is a compile error. */
function defineTag(tag: Tags): Readonly<Tags> {
  return Object.freeze(tag);
}

export const tags: Readonly<AllTags> = Object.freeze(
  Object.fromEntries(Object.keys(tagsAndMeaning).map((tag) => [tag, true])),
) as Readonly<AllTags>;

const COMMENT_TAG: Tags = defineTag({ comment: true });
const COMMENT_LINE_TAG: Tags = defineTag({ ...COMMENT_TAG, 'comment.line': true });
const COMMENT_BLOCK_TAG: Tags = defineTag({ ...COMMENT_TAG, 'comment.block': true });
const COMMENT_BLOCK_DOC_TAG: Tags = defineTag({ ...COMMENT_BLOCK_TAG, 'comment.block.doc': true });

const STRING_TAG: Tags = defineTag({ string: true });
const STRING_SINGLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.singleQuote': true });
const STRING_DOUBLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.doubleQuote': true });
const STRING_TEXT_BLOCK_TAG: Tags = defineTag({ ...STRING_TAG, 'string.textBlock': true });

export const TAGS = {
  COMMENT: COMMENT_TAG,
  COMMENT_LINE: COMMENT_LINE_TAG,
  COMMENT_BLOCK: COMMENT_BLOCK_TAG,
  COMMENT_BLOCK_DOC: COMMENT_BLOCK_DOC_TAG,
  STRING: STRING_TAG,
  STRING_SINGLE: STRING_SINGLE_TAG,
  STRING_DOUBLE: STRING_DOUBLE_TAG,
  STRING_TEXT_BLOCK: STRING_TEXT_BLOCK_TAG,
} as const;
