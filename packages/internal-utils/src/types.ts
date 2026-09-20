import type { Parser, Plugin } from '@cspell/cspell-types';

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
}

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
