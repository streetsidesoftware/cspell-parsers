import type { CSpellPlugin } from '@cspell/cspell-types';
import { customizeParserPlugin, type CustomizePluginOptions, type IPlugin } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginOptions } from '@internal/utils';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'javascript',
  },
];

export const plugin: IPlugin = {
  name: 'javascript',
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
 * import { customizePlugin } from '@cspell/parser-javascript/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'javascript-comments-only', tags: { '*': false, comment: true } })],
 *   languageSettings: [{ languageId: 'javascript,javascriptreact', parser: 'javascript-comments-only' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): CSpellPlugin {
  return customizeParserPlugin(plugin, options);
}
