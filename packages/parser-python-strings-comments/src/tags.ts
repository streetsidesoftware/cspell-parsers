/**
 * Every tag this parser can emit, and what each one means. Source of truth for both `tags` below and
 * `README.md`'s Tags table, which is generated from this object (`scripts/fix-parser-readme.ts`).
 */
export const tagsAndMeaning = {
  comment: 'Any comment',
  'comment.line': 'A `#` line comment',
  string: 'Any string-like literal',
  'string.singleQuote': "A `'...'` string literal",
  'string.doubleQuote': 'A `"..."` string literal',
  'string.tripleQuote': 'A `\'\'\'...\'\'\'` or `"""..."""` string literal',
  'string.raw': 'Any `r`-prefixed string (`r`, `rb`/`br`, `rf`/`fr`) - composes with the tags above',
  'string.interpolated': 'Any `f`-prefixed string (an f-string) - composes with the tags above',
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

const STRING_TAG: Tags = defineTag({ string: true });
const STRING_SINGLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.singleQuote': true });
const STRING_DOUBLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.doubleQuote': true });
const STRING_TRIPLE_TAG: Tags = defineTag({ ...STRING_TAG, 'string.tripleQuote': true });

/**
 * `string.raw`/`string.interpolated` are kept as standalone flags rather than pre-declared combinations with
 * every quote-style tag above - a string literal's prefix (`isRaw`/`isF`) is known independently of its
 * quote style, so the scanner composes these onto a base quote-style tag itself (see `scanner.ts`'s
 * `stringTags`) instead of enumerating every combination here.
 */
const STRING_RAW_FLAG: Tags = defineTag({ 'string.raw': true });
const STRING_INTERPOLATED_FLAG: Tags = defineTag({ 'string.interpolated': true });

/** Identifiers, keywords, punctuation, and numbers - everything not a comment or string. */
const CODE_TAG: Tags = defineTag({ code: true });

export const TAGS = {
  COMMENT: COMMENT_TAG,
  COMMENT_LINE: COMMENT_LINE_TAG,
  STRING: STRING_TAG,
  STRING_SINGLE: STRING_SINGLE_TAG,
  STRING_DOUBLE: STRING_DOUBLE_TAG,
  STRING_TRIPLE: STRING_TRIPLE_TAG,
  STRING_RAW_FLAG,
  STRING_INTERPOLATED_FLAG,
  CODE: CODE_TAG,
} as const;
