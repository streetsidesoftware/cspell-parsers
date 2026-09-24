import type { ParsedTags, ParsedText, Parser, ParseResult, Plugin } from '@cspell/cspell-types';

export interface ParserTags {
  /**
   * A dictionary of parser tags, where the key is the tag name and the value indicates if it will be emitted.
   */
  [tag: string]: boolean;
}

export interface PluginParser extends Parser {
  /**
   * The known list of file types that this parser is capable of handling.
   */
  supportedFileTypes: Readonly<string[]>;
  /**
   * The set of tags that this parser can emit.
   * Each key represents a tag name, and the corresponding boolean value
   * indicates whether the parser will emit that tag by default.
   */
  tags: Readonly<ParserTags>;

  /**
   * Customize this parser.
   *
   * This allows you to change the name and filter the text segments emitted by the parser
   * based on the specified tag filter options.
   *
   * @param options - The customization options to apply to the parser.
   * @returns A new parser with the specified customizations applied.
   */
  customize(options: CustomizeParserOptions): PluginParser;

  customizeFilter(filter: ParsedTextFilter): PluginParser;
  customizeSupportedFileTypes(supportedFileTypes: Readonly<string[]>): PluginParser;
}

export type ParseFunction = (content: string, filename: string) => ParseResult;
export type ParsedTextFilter = (parsedText: ParsedText) => boolean;

export interface ParserPlugin extends Plugin {
  name: string;
  parsers: PluginParser[];
  supportedFileTypes: Readonly<string[]>;
  recommendedLanguageSettings: RecommendedLanguageSettings;
}

export interface RecommendedLanguageSetting {
  languageId: string;
  parser: string;
}

export type RecommendedLanguageSettings = RecommendedLanguageSetting[];

export interface RecommendedSettings {
  plugins: ParserPlugin[];
  languageSettings: RecommendedLanguageSettings;
}

/**
 * A tag name, or a `*`-wildcard pattern matching one (see {@link TagFilterOptions}).
 */
export type TagPattern = string;

/**
 * Options for {@link customizeParser}: which tagged segments to keep.
 *
 * Deliberately declared here rather than imported from `@cspell/cspell-types`'s `ValidationTags` - the
 * two happen to share a shape today, but that's incidental. `customizeParser`'s options are a property of
 * its own filtering behavior and should be free to diverge from it.
 */
export interface TagFilterOptions {
  /**
   * The default filter setting for any tag not otherwise matched.
   * @default true
   */
  '*'?: boolean | undefined;

  /**
   * Filter setting for the specific tag or wildcard pattern.
   *
   * If not specified, the default (`'*'`) will be used.
   */
  [tag: TagPattern]: boolean | undefined;
}

/**
 * Decides whether a `ParsedText` should be kept (spell checked), given its `tags`.
 */
export type TagsFilter = (tags: ParsedTags | undefined) => boolean;

/**
 * Options for {@link PluginParser.customize}, as a struct rather than a bare `TagFilterOptions` so it can grow
 * more options later without a breaking signature change.
 */
export interface CustomizeParserOptions {
  /**
   * Override the parser's `name`. Useful when registering more than one customized copy of the same
   * parser (e.g. under `plugins`), since cspell selects a parser by name and two parsers can't share one.
   */
  name?: string;
  /**
   * Which tagged segments to keep. Omit to keep the parser's own defaults.
   */
  tags?: TagFilterOptions;
}
