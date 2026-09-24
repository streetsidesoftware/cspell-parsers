import type { CSpellPlugin } from '@cspell/cspell-types';
import type { CustomizePluginOptions, IPlugin } from '@internal/utils';
import { customizeParserPlugin } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginOptions } from '@internal/utils';

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
