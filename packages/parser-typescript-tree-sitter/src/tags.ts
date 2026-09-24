import { codeTagMeaning } from '@internal/utils';

/**
 * Every tag this parser can emit, and what each one means. Source of truth for both `tags` below and
 * `README.md`'s Tags table, which is generated from this object (`scripts/fix-parser-readme.ts`).
 */
export const tagsAndMeaning = {
  string: "A string literal (fallback for a quote style that's neither `'` nor `\"`)",
  'string.singleQuote': "A `'...'` string literal",
  'string.doubleQuote': 'A `"..."` string literal',
  'string.module': "A module specifier string literal (fallback for a quote style that's neither `'` nor `\"`)",
  'string.singleQuote.module': "A `'...'` string literal that is also a module specifier",
  'string.doubleQuote.module': 'A `"..."` string literal that is also a module specifier',
  'string.templateLiteral':
    'A literal text fragment of a template string (`` `...` ``), excluding `${...}` substitutions',
  module: 'Any module specifier string',
  'module.specifier': 'Any module specifier string (same as `module`, for a more specific filter)',
  'module.specifier.literal':
    "The module specifier string of an `import`/`export ... from` statement or a dynamic `import('...')` call",
  comment: 'Any comment',
  'comment.line': 'A `//` line comment',
  'comment.block': 'A `/* ... */` block comment',
  'comment.block.doc': 'A `/** ... */` doc comment',
  identifier: 'Any identifier',
  'identifier.variable': 'A variable name',
  'identifier.property': 'An object or class property name',
  'identifier.privateProperty': 'A `#private` class property name',
  'identifier.type': 'A type name',
  'identifier.shorthandProperty': 'A shorthand object property name (the `foo` in `{ foo }`)',
  'identifier.label': 'A statement label',
  'identifier.importBinding': 'A renamed import alias, default import name, or namespace import name',
  'identifier.exportBinding': 'A renamed export alias (`export { x as y }`)',
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

/**
 * Expands `tag` into itself plus every dot-separated ancestor prefix, e.g. `hierarchicalTags('comment.block.doc')`
 * → `{ comment: true, 'comment.block': true, 'comment.block.doc': true }`, so a consumer can filter at any
 * level without its own prefix matching. `tag`'s type restricts this to a documented tag; every ancestor
 * prefix of a documented tag is itself documented, by this file's own convention.
 */
function hierarchicalTags(tag: TagName): Tags {
  const segments = tag.split('.');
  const result: Record<string, true> = {};
  for (let i = 1; i <= segments.length; i++) {
    result[segments.slice(0, i).join('.')] = true;
  }
  return result;
}

const STRING_TAG = defineTag(hierarchicalTags('string'));
const STRING_SINGLE_QUOTE_TAG = defineTag(hierarchicalTags('string.singleQuote'));
const STRING_DOUBLE_QUOTE_TAG = defineTag(hierarchicalTags('string.doubleQuote'));
const STRING_TEMPLATE_LITERAL_TAG = defineTag(hierarchicalTags('string.templateLiteral'));

/**
 * A module specifier string gets both the usual `string`/`string.singleQuote`/`string.doubleQuote`
 * hierarchy (with `.module` appended) and the quote-style-independent `module.specifier.literal`.
 */
const MODULE_SPECIFIER_LITERAL_TAG = defineTag(hierarchicalTags('module.specifier.literal'));
const STRING_MODULE_TAG = defineTag({ ...hierarchicalTags('string.module'), ...MODULE_SPECIFIER_LITERAL_TAG });
const STRING_SINGLE_QUOTE_MODULE_TAG = defineTag({
  ...hierarchicalTags('string.singleQuote.module'),
  ...MODULE_SPECIFIER_LITERAL_TAG,
});
const STRING_DOUBLE_QUOTE_MODULE_TAG = defineTag({
  ...hierarchicalTags('string.doubleQuote.module'),
  ...MODULE_SPECIFIER_LITERAL_TAG,
});

const COMMENT_LINE_TAG = defineTag(hierarchicalTags('comment.line'));
const COMMENT_BLOCK_TAG = defineTag(hierarchicalTags('comment.block'));
const COMMENT_BLOCK_DOC_TAG = defineTag(hierarchicalTags('comment.block.doc'));

export type IdentifierKind =
  | 'variable'
  | 'property'
  | 'privateProperty'
  | 'type'
  | 'shorthandProperty'
  | 'label'
  | 'importBinding'
  | 'exportBinding';

/** Tag for each `IdentifierKind`, precomputed once rather than built fresh per emitted identifier. */
const identifierTagByKind: Record<IdentifierKind, Tags> = {
  variable: defineTag(hierarchicalTags('identifier.variable')),
  property: defineTag(hierarchicalTags('identifier.property')),
  privateProperty: defineTag(hierarchicalTags('identifier.privateProperty')),
  type: defineTag(hierarchicalTags('identifier.type')),
  shorthandProperty: defineTag(hierarchicalTags('identifier.shorthandProperty')),
  label: defineTag(hierarchicalTags('identifier.label')),
  importBinding: defineTag(hierarchicalTags('identifier.importBinding')),
  exportBinding: defineTag(hierarchicalTags('identifier.exportBinding')),
};

/** Punctuation, keywords, and anything else `walk` doesn't visit - everything not a comment, string, or identifier. */
const CODE_TAG: Tags = defineTag({ code: true });

export const TAGS = {
  STRING: STRING_TAG,
  STRING_SINGLE_QUOTE: STRING_SINGLE_QUOTE_TAG,
  STRING_DOUBLE_QUOTE: STRING_DOUBLE_QUOTE_TAG,
  STRING_TEMPLATE_LITERAL: STRING_TEMPLATE_LITERAL_TAG,
  STRING_MODULE: STRING_MODULE_TAG,
  STRING_SINGLE_QUOTE_MODULE: STRING_SINGLE_QUOTE_MODULE_TAG,
  STRING_DOUBLE_QUOTE_MODULE: STRING_DOUBLE_QUOTE_MODULE_TAG,
  COMMENT_LINE: COMMENT_LINE_TAG,
  COMMENT_BLOCK: COMMENT_BLOCK_TAG,
  COMMENT_BLOCK_DOC: COMMENT_BLOCK_DOC_TAG,
  IDENTIFIER_BY_KIND: identifierTagByKind,
  CODE: CODE_TAG,
} as const;
