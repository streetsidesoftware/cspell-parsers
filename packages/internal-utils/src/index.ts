export type { ParsedTextEmitter } from './codeTagEmitter.ts';
export { createCodeTagsEmitter } from './codeTagEmitter.ts';
export type { CommentText } from './comments.ts';
export { stripCommentMarkers } from './comments.ts';
export { createParsedTextFilter } from './customize.ts';
export type { HtmlTextPart } from './htmlEntities.ts';
export { decodeHtmlCharacterReference, decodeHtmlTextParts } from './htmlEntities.ts';
export type { CreatePluginParserWithFilterTagsOptions } from './parserDef.ts';
export { createPluginParserWithFilterTags } from './parserDef.ts';
export type { CreatePluginOptions } from './plugin.ts';
export { createPlugin, customizePluginWith } from './plugin.ts';
export type { DecodedText, StringPart } from './strings.ts';
export { decodeStringParts } from './strings.ts';
export { codeTagMeaning } from './tags.ts';
export type {
  CustomizePluginOptions,
  DefineConfigSettings,
  DefinedConfig,
  FileTypeTarget,
  IParser,
  IPlugin,
  IPluginBuilder,
  ParsedTextFilter,
  ParseFunction,
  ParserTags,
  ParserTarget,
  RecommendedLanguageSetting,
  RecommendedLanguageSettings,
  RecommendedSettings,
  SelectedCSpellSettings,
  TagFilterOptions,
  TagPattern,
  TagsFilter,
} from './types.ts';
