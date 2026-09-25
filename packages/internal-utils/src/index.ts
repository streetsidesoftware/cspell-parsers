export type { ParsedTextEmitter } from './codeTagEmitter.ts';
export { createCodeTagsEmitter } from './codeTagEmitter.ts';
export type { CommentText } from './comments.ts';
export { stripCommentMarkers } from './comments.ts';
export { createParsedTextFilter } from './customize.ts';
export { toLegacyPlugin } from './legacy.ts';
export type { CreatePluginParserOptions } from './parser.ts';
export { createParse, createPluginParser, customizeParser, customizeParserPlugin } from './parser.ts';
export type { CreatePluginParserWithFilterTagsOptions } from './parserEx.ts';
export { createPluginParserWithFilterTags } from './parserEx.ts';
export type { CreatePluginExOptions } from './pluginEx.ts';
export { createPluginEx, customizeParserEx, customizePluginEx } from './pluginEx.ts';
export type { DecodedText, StringPart } from './strings.ts';
export { decodeStringParts } from './strings.ts';
export { codeTagMeaning } from './tags.ts';
export type {
  CustomizeParserOptions,
  CustomizePluginExOptions,
  CustomizePluginOptions,
  DefineConfigSettings,
  DefinedConfig,
  FileTypeTarget,
  IParser,
  IParserEx,
  IPlugin,
  IPluginBuilder,
  IPluginEx,
  IPluginExBase,
  ParsedTextFilter,
  ParseFunction,
  ParserTags,
  ParserTarget,
  RecommendedLanguageSetting,
  RecommendedLanguageSettings,
  RecommendedSettings,
  TagFilterOptions,
  TagPattern,
  TagsFilter,
} from './types.ts';
