import type { CSpellPlugin } from '@cspell/cspell-types';
import type { CustomizePluginOptions, IPlugin } from '@internal/utils';
import { customizeParserPlugin } from '@internal/utils';

import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginOptions } from '@internal/utils';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'typescript',
  },
];

export const plugin: IPlugin = {
  name: 'typescript-tree-sitter-wasm',
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
 * import { customizePlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'typescript-comments-only', tags: { '*': false, comment: true } })],
 *   languageSettings: [{ languageId: 'typescript,typescriptreact', parser: 'typescript-comments-only' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): CSpellPlugin {
  return customizeParserPlugin(plugin, options);
}
