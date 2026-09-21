/**
 * Every tag this parser can emit, and what each one means to a consumer - the single source of truth for
 * both `tags` (below, what `createPluginParser` is given) and `README.md`'s Tags table, which is generated
 * from this object (see `scripts/fix-tags-readme.ts` at the repo root) rather than hand-copied from it.
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

/**
 * The shape every tag constant below is declared as - deliberately not the wide-open `ParsedTags`
 * (`{[tag: string]: boolean}`), so a tag key that isn't in `tagsAndMeaning` above fails to compile rather
 * than silently becoming a real, emitted-but-undocumented tag (the reverse - a documented tag that's never
 * actually emitted - is fine; see `defineTag`'s doc comment for why this only works when going through it).
 */
export type Tags = Partial<AllTags>;

/**
 * Helper to ensure proper typing and compile-time checking of tag objects.
 */
function defineTag(tag: Tags): Readonly<Tags> {
  return Object.freeze(tag);
}

/**
 * Tags that deviate from "emitted and spell checked by default" - kept as a short, explicit exception list
 * rather than restating every tag's default, since a deviation like this should stay rare and visible.
 * `code` is the one tag in this package a consumer has to opt into (see `CODE_TAG`'s doc comment below).
 */
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

/**
 * Everything inside a PHP region that isn't a comment or string literal - identifiers, keywords, punctuation,
 * numbers, and the `<?php`/`<?=`/`<?`/`?>` tag delimiters themselves - emitted so it still gets spell checked
 * by default (the same as if no parser applied to it) rather than silently dropped.
 */
const CODE_TAG: Tags = defineTag({ code: true });

/**
 * The HTML markup pass-through segments outside `<?php ... ?>` - deliberately its own top-level tag, a
 * sibling of `code` rather than nested under it, since HTML markup isn't PHP code, and not nested under
 * `string` or `comment` either, since it isn't either of those.
 */
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
