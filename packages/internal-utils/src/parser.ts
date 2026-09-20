import { compileTagFilter, customizeParserWithFilter } from './customize.js';
import type { CustomizeParserOptions, PluginParser } from './types.js';

export type CreatePluginParserOptions = Pick<PluginParser, 'name' | 'parse' | 'supportedFileTypes' | 'tags'>;

export function createPluginParser(options: CreatePluginParserOptions): PluginParser {
  // Implementation goes here
  return {
    name: options.name,
    parse: options.parse,
    supportedFileTypes: options.supportedFileTypes,
    tags: options.tags,
    customize(options) {
      return customizeParser(this, options);
    },
  };
}

/**
 * Wraps a single `Parser` so its `parse()` output only includes `parsedTexts` selected by
 * `options.tags`, and its `name` is `options.name` when given. `options.tags` is compiled into a
 * {@link TagsFilter} once here, before the parser ever runs - see {@link compileTagFilter}.
 */
export function customizeParser(parser: PluginParser, options: CustomizeParserOptions): PluginParser {
  if (!options.tags || Object.keys(options.tags).length === 0) {
    return options.name ? { ...parser, name: options.name } : parser;
  }
  return { ...parser, ...customizeParserWithFilter(parser, compileTagFilter(options.tags), options.name) };
}
