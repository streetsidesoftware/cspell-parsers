import type { CSpellPlugin } from '@cspell/cspell-types';
import { customizeParserPlugin, type IPlugin, type TagFilterOptions } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'csharp-strings-comments',
  },
];

export const plugin: IPlugin = {
  name: 'csharp-strings-comments',
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
 * import { customizePlugin } from '@cspell/parser-csharp-strings-comments/plugin';
 *
 * export default {
 *   // only check XML doc comments
 *   plugins: [customizePlugin({ name: 'csharp-only-docs', tags: { '*': false, 'comment.line.doc': true } })],
 *   languageSettings: [{ languageId: 'csharp', parser: 'csharp-only-docs' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): CSpellPlugin {
  return customizeParserPlugin(plugin, options);
}
