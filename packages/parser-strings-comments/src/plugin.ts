import type { Parser } from '@cspell/cspell-types';
import { plugin as pluginC } from '@cspell/parser-c-cpp-strings-comments/plugin';
import { plugin as pluginCsharp } from '@cspell/parser-csharp-strings-comments/plugin';
import { plugin as pluginGo } from '@cspell/parser-go-strings-comments/plugin';
import { plugin as pluginJava } from '@cspell/parser-java-strings-comments/plugin';
import { plugin as pluginPhp } from '@cspell/parser-php-strings-comments/plugin';
import { plugin as pluginPython } from '@cspell/parser-python-strings-comments/plugin';
import { plugin as pluginRuby } from '@cspell/parser-ruby-strings-comments/plugin';
import { plugin as pluginRust } from '@cspell/parser-rust-strings-comments/plugin';
import { plugin as pluginTypescript } from '@cspell/parser-typescript-strings-comments/plugin';
import type { ParserPlugin, RecommendedLanguageSettings } from '@internal/utils';
import type { TagFilterOptions } from '@internal/utils';
import { customizeParser } from '@internal/utils';

const allPlugins = [
  pluginC,
  pluginCsharp,
  pluginGo,
  pluginJava,
  pluginPhp,
  pluginPython,
  pluginRuby,
  pluginRust,
  pluginTypescript,
];

const allParsers = allPlugins.flatMap((p) => p.parsers);

export const supportedFileTypes: string[] = [...new Set(allPlugins.flatMap((p) => p.supportedFileTypes))];

export const recommendedLanguageSettings: RecommendedLanguageSettings = allPlugins.flatMap(
  (p) => p.recommendedLanguageSettings,
);

export interface ParserPluginEx extends ParserPlugin {
  getParserName(fileType?: string): string | undefined;
  getParser(fileType?: string): Parser | undefined;
}

export const plugin: ParserPluginEx = {
  name: 'strings-comments',
  parsers: allParsers,
  supportedFileTypes,
  recommendedLanguageSettings,
  getParserName(fileType?: string): string | undefined {
    return this.getParser(fileType)?.name;
  },
  getParser(fileType?: string) {
    const p = !fileType ? this.parsers : getParsersByFileType(fileType);
    return p.slice(-1)[0] || undefined;
  },
};

const parsersByFileType = groupParsersByFileType(allPlugins);

export function getParsersByFileType(fileType?: string): ParserPlugin['parsers'] {
  return !fileType ? allParsers : parsersByFileType.get(fileType) || [];
}

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizePluginOptions {
  /** The name of the plugin */
  name?: string;

  /** Tagged segments to keep; omit to keep everything. */
  tags: TagFilterOptions;
}

function groupParsersByFileType(plugins: ParserPlugin[]): Map<string, ParserPlugin['parsers']> {
  const parsersByFileType: Map<string, ParserPlugin['parsers']> = new Map();
  for (const plugin of plugins) {
    for (const fileType of plugin.supportedFileTypes) {
      const parsers = parsersByFileType.get(fileType) || [];
      parsers.push(...plugin.parsers);
      parsersByFileType.set(fileType, parsers);
    }
  }
  return parsersByFileType;
}

/**
 *
 * @param fileType - customize for
 * @param options
 * @returns
 */
export function customizePlugin(fileType: string, options: CustomizePluginOptions): ParserPluginEx {
  const opts: CustomizePluginOptions = { tags: options.tags };
  if (options.name && fileType !== '*') {
    opts.name = options.name;
  }
  const plugins = customizeImportedPlugins(
    allPlugins.filter((p) => p.parsers.length && (p.supportedFileTypes.includes(fileType) || fileType === '*')),
    opts,
  );
  const parsersByFileType = groupParsersByFileType(plugins.map((p) => p));
  const parsers = [...new Set([...parsersByFileType.values()].flat())];
  const supportedFileTypes = [...parsersByFileType.keys()];
  const recommendedLanguageSettings = plugins.map((p) => ({
    languageId: filterFileTypes(fileType, p.supportedFileTypes).join(','),
    parser: p.parsers.slice(-1)[0]?.name,
  }));
  return {
    name: options.name || plugin.name,
    parsers,
    supportedFileTypes,
    recommendedLanguageSettings,
    getParserName(fileType?: string): string | undefined {
      return this.getParser(fileType)?.name;
    },
    getParser(fileType?: string) {
      const p = !fileType ? this.parsers : parsersByFileType.get(fileType) || [];
      return p.slice(-1)[0] || undefined;
    },
  };
}

function customizeImportedPlugins(plugins: ParserPlugin[], options: CustomizePluginOptions): ParserPlugin[] {
  return plugins.map((plugin) => customizeImportedPlugin(plugin, options));
}

function customizeImportedPlugin(plugin: ParserPlugin, options: CustomizePluginOptions): ParserPlugin {
  return { ...plugin, parsers: plugin.parsers.map((parser) => customizeParser(parser, options)) };
}

function filterFileTypes(fileType: string, supportedFileTypes: string[]): string[] {
  if (fileType === '*') {
    return supportedFileTypes;
  }
  return supportedFileTypes.filter((ft) => ft === fileType);
}
