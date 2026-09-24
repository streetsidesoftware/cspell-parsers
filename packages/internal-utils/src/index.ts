export type { ParsedTextEmitter } from './codeTagEmitter.ts';
export { createCodeTagsEmitter } from './codeTagEmitter.ts';
export type { CommentText } from './comments.ts';
export { stripCommentMarkers } from './comments.ts';
export { createParsedTextFilter } from './customize.ts';
export type { CreatePluginParserOptions } from './parser.ts';
export { createParse, createPluginParser, customizeParser, customizeParserPlugin } from './parser.ts';
export type { DecodedText, StringPart } from './strings.ts';
export { decodeStringParts } from './strings.ts';
export { codeTagMeaning } from './tags.ts';
export type {
  CustomizeParserOptions,
  CustomizePluginOptions,
  IParser,
  IPlugin,
  ParsedTextFilter,
  ParseFunction,
  ParserTags,
  RecommendedLanguageSetting,
  RecommendedLanguageSettings,
  RecommendedSettings,
  TagFilterOptions,
  TagPattern,
  TagsFilter,
} from './types.ts';
