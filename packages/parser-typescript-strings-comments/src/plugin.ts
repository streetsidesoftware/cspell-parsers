import type { CSpellPlugin } from '@cspell/cspell-types';
import type { CustomizePluginOptions, IPlugin } from '@internal/utils';
import { customizeParserPlugin } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginOptions } from '@internal/utils';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'typescript-strings-comments',
  },
];

export const plugin: IPlugin = {
  name: 'typescript-strings-comments',
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
 * import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';
 *
 * export default {
 *   // only check doc comments
 *   plugins: [customizePlugin({ name: 'typescript-only-docs', tags: { '*': false, 'comment.block.doc': true } })],
 *   languageSettings: [{ languageId: 'typescript', parser: 'typescript-only-docs' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): CSpellPlugin {
  return customizeParserPlugin(plugin, options);
}
