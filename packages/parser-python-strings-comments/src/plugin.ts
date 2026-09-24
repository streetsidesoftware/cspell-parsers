import type { CSpellPlugin } from '@cspell/cspell-types';
import { customizeParserPlugin, type CustomizePluginOptions, type IPlugin } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginOptions } from '@internal/utils';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'python-strings-comments',
  },
];

export const plugin: IPlugin = {
  name: 'python-strings-comments',
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
 * import { customizePlugin } from '@cspell/parser-python-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'python-no-f-strings', tags: { 'string.interpolated': false } })], // skip f-strings
 *   languageSettings: [{ languageId: 'python', parser: 'python-no-f-strings' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): CSpellPlugin {
  return customizeParserPlugin(plugin, options);
}
