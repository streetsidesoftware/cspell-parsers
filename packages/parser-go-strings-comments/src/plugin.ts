import type { Plugin } from '@cspell/cspell-types';
import { customizeParserPlugin, type ParserPlugin, type TagFilterOptions } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'go-strings-comments',
  },
];

export const plugin: ParserPlugin = {
  name: 'go-strings-comments',
  parsers: [parser],
  supportedFileTypes,
  recommendedLanguageSettings,
};

/** Options for {@link customizePlugin}: the parser's name, and which tagged segments to keep. */
export interface CustomizePluginOptions {
  /**
   * Set the name of the parser. Does not change the plugin's own name.
   */
  name?: string;
  /**
   * Define which tagged segments to keep. Omit to keep the parser's own defaults (`code` excluded).
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
 * import { customizePlugin } from '@cspell/parser-go-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'go-strings-only', tags: { '*': false, string: true } })], // only check string/rune literals
 *   languageSettings: [{ languageId: 'go', parser: 'go-strings-only' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return customizeParserPlugin(plugin, options);
}
