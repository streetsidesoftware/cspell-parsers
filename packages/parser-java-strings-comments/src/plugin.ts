import type { Plugin } from '@cspell/cspell-types';
import { customizeParser, type ParserPlugin, type TagFilterOptions } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.js';

export { supportedFileTypes } from './parser.js';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'java-strings-comments',
  },
];

export const plugin: ParserPlugin = {
  name: 'java-strings-comments',
  parsers: [parser],
  supportedFileTypes,
  recommendedLanguageSettings,
};

/** Options for {@link customizePlugin}: the parser's name, and which tagged segments to keep. */
export interface CustomizePluginOptions {
  /**
   * Set the name of the plugin and parser.
   */
  name?: string;
  /**
   * Define which tagged segments to keep. Omit to keep everything.
   */
  tags?: TagFilterOptions;
}

/**
 * Create a customized copy of {@link plugin} - rename its parser and/or choose which tagged segments get
 * spell checked. Works with any cspell version.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-java-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'javadoc-only', tags: { '*': false, 'comment.block.doc': true } })], // only check Javadoc comments
 *   languageSettings: [{ languageId: 'java', parser: 'javadoc-only' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
