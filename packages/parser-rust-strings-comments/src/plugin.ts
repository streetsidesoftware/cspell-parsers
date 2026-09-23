import type { Plugin } from '@cspell/cspell-types';
import { customizeParser, type ParserPlugin, type TagFilterOptions } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'rust-strings-comments',
  },
];

export const plugin: ParserPlugin = {
  name: 'rust-strings-comments',
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
 * import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';
 *
 * export default {
 *   plugins: [
 *     customizePlugin({
 *       name: 'rust-only-docs',
 *       tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true },
 *     }), // only check doc comments
 *   ],
 *   languageSettings: [{ languageId: 'rust', parser: 'rust-only-docs' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
