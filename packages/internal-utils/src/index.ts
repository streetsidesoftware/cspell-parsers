export type { ParsedTextEmitter } from './codeTagEmitter.ts';
export { createCodeTagsEmitter } from './codeTagEmitter.ts';
export type { CommentText } from './comments.ts';
export { stripCommentMarkers } from './comments.ts';
export { createParsedTextFilter } from './customize.ts';
export type { HtmlTextPart } from './htmlEntities.ts';
export { decodeHtmlCharacterReference, decodeHtmlTextParts } from './htmlEntities.ts';
export type { CreatePluginParserWithFilterTagsOptions } from './parserEx.ts';
export { createPluginParserWithFilterTags } from './parserEx.ts';
export type { CreatePluginExOptions } from './pluginEx.ts';
export { createPluginEx, customizePluginEx } from './pluginEx.ts';
export type { DecodedText, StringPart } from './strings.ts';
export { decodeStringParts } from './strings.ts';
export { codeTagMeaning } from './tags.ts';
export type {
  CustomizePluginExOptions,
  DefineConfigSettings,
  DefinedConfig,
  FileTypeTarget,
  IParserEx,
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
