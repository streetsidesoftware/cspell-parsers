import { createParsedTextFilter } from './customize.ts';
import { createPluginParser } from './parser.ts';
import type { IParser, IParserEx, IPlugin, IPluginExBase } from './types.ts';

/**
 * Adapts a migrated plugin for code still on the old `IPlugin` API (the `parser-strings-comments` bundle).
 * It's removed once every package has migrated.
 * See docs/ADRs/plugin-customization/0002-compatibility-and-migration.md.
 */
export function toLegacyPlugin(plugin: IPluginExBase): IPlugin {
  return {
    name: plugin.name,
    parsers: plugin.parsers.map(toLegacyParser),
    supportedFileTypes: plugin.supportedFileTypes,
    recommendedLanguageSettings: plugin.languageSettings(),
  };
}

function toLegacyParser(parser: IParserEx): IParser {
  const { name, _parse: parse, supportedFileTypes, tags } = parser;
  return createPluginParser(
    { name, parse, supportedFileTypes, tags },
    createParsedTextFilter(parser.filterTags ?? {}, tags),
  );
}
