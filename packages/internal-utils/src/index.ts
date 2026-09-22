export type { ParsedTextEmitter } from './codeTagEmitter.js';
export { createCodeTagsEmitter } from './codeTagEmitter.js';
export type { CommentText } from './comments.js';
export { stripCommentMarkers } from './comments.js';
export { createParsedTextFilter } from './customize.js';
export type { CreatePluginParserOptions } from './parser.js';
export { createParse, createPluginParser, customizeParser } from './parser.js';
export type { DecodedText, StringPart } from './strings.js';
export { decodeStringParts } from './strings.js';
export type {
  CustomizeParserOptions,
  ParsedTextFilter,
  ParseFunction,
  ParserPlugin,
  ParserTags,
  PluginParser,
  RecommendedLanguageSetting,
  RecommendedLanguageSettings,
  RecommendedSettings,
  TagFilterOptions,
  TagPattern,
  TagsFilter,
} from './types.js';
