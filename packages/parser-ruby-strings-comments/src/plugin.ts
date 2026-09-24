import type { CSpellPlugin } from '@cspell/cspell-types';
import { customizeParserPlugin, type CustomizePluginOptions, type IPlugin } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginOptions } from '@internal/utils';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'ruby-strings-comments',
  },
];

export const plugin: IPlugin = {
  name: 'ruby-strings-comments',
  parsers: [parser],
  supportedFileTypes,
  recommendedLanguageSettings,
};

/**
 * Create a customized copy of {@link plugin} - rename its parser and/or choose which tagged segments get
 * spell checked. Filtering happens in the parser itself, before cspell ever sees the excluded segments, so
 * it works with any cspell version.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ tags: { 'string.heredoc': false } })], // exclude heredocs - often SQL/text blobs
 *   languageSettings: [{ languageId: 'ruby', parser: 'ruby-strings-comments' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): CSpellPlugin {
  return customizeParserPlugin(plugin, options);
}
