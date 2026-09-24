import type { CSpellPlugin } from '@cspell/cspell-types';
import { customizeParserPlugin, type CustomizePluginOptions, type IPlugin } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginOptions } from '@internal/utils';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'go-strings-comments',
  },
];

export const plugin: IPlugin = {
  name: 'go-strings-comments',
  parsers: [parser],
  supportedFileTypes,
  recommendedLanguageSettings,
};

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
export function customizePlugin(options: CustomizePluginOptions): CSpellPlugin {
  return customizeParserPlugin(plugin, options);
}
