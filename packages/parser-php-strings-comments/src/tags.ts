/**
 * Every tag this parser can emit, and what each one means. Source of truth for both `tags` below and
 * `README.md`'s Tags table, which is generated from this object (`scripts/fix-tags-readme.ts`).
 */
export const tagsAndMeaning = {
  comment: 'Any comment',
  'comment.line': 'A `//` or `#` line comment (`#[` starts a PHP 8 attribute, not a comment)',
  'comment.block': 'A `/* ... */` block comment',
  'comment.block.doc': 'A `/** ... */` PHPDoc-style comment',
  string: 'Any string-like literal',
  'string.singleQuote': "A `'...'` string literal (no interpolation)",
  'string.doubleQuote': 'A `"..."` string literal (interpolation-aware)',
  'string.heredoc': 'A `<<<ID ... ID` heredoc body (interpolation-aware)',
  'string.nowdoc': "A `<<<'ID' ... ID` nowdoc body (no interpolation)",
  html: 'HTML (or other non-PHP) content outside `<?php`/`<?=`/`<?` ... `?>`',
  code: "PHP code that isn't a comment or string (identifiers, keywords, punctuation, numbers, tag delimiters)",
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
const STRING_HEREDOC_TAG: Tags = defineTag({ ...STRING_TAG, 'string.heredoc': true });
const STRING_NOWDOC_TAG: Tags = defineTag({ ...STRING_TAG, 'string.nowdoc': true });

/** Identifiers, keywords, punctuation, numbers, and tag delimiters - everything not a comment or string. */
const CODE_TAG: Tags = defineTag({ code: true });

/** HTML markup outside `<?php ... ?>` - a top-level tag, sibling to `code`, not nested under it. */
const HTML_TAG: Tags = defineTag({ html: true });

export const TAGS = {
  COMMENT: COMMENT_TAG,
  COMMENT_LINE: COMMENT_LINE_TAG,
  COMMENT_BLOCK: COMMENT_BLOCK_TAG,
  COMMENT_BLOCK_DOC: COMMENT_BLOCK_DOC_TAG,
  STRING: STRING_TAG,
  STRING_SINGLE: STRING_SINGLE_TAG,
  STRING_DOUBLE: STRING_DOUBLE_TAG,
  STRING_HEREDOC: STRING_HEREDOC_TAG,
  STRING_NOWDOC: STRING_NOWDOC_TAG,
  CODE: CODE_TAG,
  HTML: HTML_TAG,
} as const;
