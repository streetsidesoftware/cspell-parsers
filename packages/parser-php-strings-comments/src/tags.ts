import type { ParsedTags } from '@cspell/cspell-types';
import type { ParserTags } from '@internal/utils';

const COMMENT_TAG: ParsedTags = Object.freeze({ comment: true });
const COMMENT_LINE_TAG: ParsedTags = Object.freeze({ ...COMMENT_TAG, 'comment.line': true });
const COMMENT_BLOCK_TAG: ParsedTags = Object.freeze({ ...COMMENT_TAG, 'comment.block': true });
const COMMENT_BLOCK_DOC_TAG: ParsedTags = Object.freeze({ ...COMMENT_BLOCK_TAG, 'comment.block.doc': true });

const STRING_TAG: ParsedTags = Object.freeze({ string: true });
const STRING_SINGLE_TAG: ParsedTags = Object.freeze({ ...STRING_TAG, 'string.singleQuote': true });
const STRING_DOUBLE_TAG: ParsedTags = Object.freeze({ ...STRING_TAG, 'string.doubleQuote': true });
const STRING_HEREDOC_TAG: ParsedTags = Object.freeze({ ...STRING_TAG, 'string.heredoc': true });
const STRING_NOWDOC_TAG: ParsedTags = Object.freeze({ ...STRING_TAG, 'string.nowdoc': true });

/**
 * Everything inside a PHP region that isn't a comment or string literal - identifiers, keywords, punctuation,
 * numbers, and the `<?php`/`<?=`/`<?`/`?>` tag delimiters themselves - emitted so it still gets spell checked
 * by default (the same as if no parser applied to it) rather than silently dropped.
 */
const CODE_TAG: ParsedTags = Object.freeze({ code: true });

/**
 * The HTML markup pass-through segments outside `<?php ... ?>` - deliberately its own top-level tag, a
 * sibling of `code` rather than nested under it, since HTML markup isn't PHP code, and not nested under
 * `string` or `comment` either, since it isn't either of those.
 */
const HTML_TAG: ParsedTags = Object.freeze({ html: true });

/**
 * Tags that deviate from "emitted and spell checked by default" - kept as a short, explicit exception list
 * rather than restating every tag's default, since a deviation like this should stay rare and visible.
 * `code` is the one tag in this package a consumer has to opt into (see `CODE_TAG`'s doc comment above).
 */
const NOT_ON_BY_DEFAULT: ParsedTags[] = [CODE_TAG];

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

const availableTags = Object.values(TAGS);
const notOnByDefaultTags: Set<string> = new Set(NOT_ON_BY_DEFAULT.flatMap(Object.keys));

export const tags: Readonly<ParserTags> = Object.freeze(
  Object.fromEntries(
    [...new Set(availableTags.flatMap(Object.keys))].map((tag) => [tag, !notOnByDefaultTags.has(tag)]),
  ),
);
