import type { Parser, Plugin } from '@cspell/cspell-types';

export interface ParserPlugin extends Plugin {
  name: string;
  parsers: Parser[];
  supportedFileTypes: string[];
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
