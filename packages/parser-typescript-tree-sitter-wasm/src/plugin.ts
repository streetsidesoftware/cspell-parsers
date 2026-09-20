import type { Plugin } from '@cspell/cspell-types';
import { customizeParser, type ParserPlugin } from '@internal/utils';

import type { CustomizeParserOptions } from './parser.js';
import { parser, supportedFileTypes } from './parser.js';

export { supportedFileTypes } from './parser.js';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'typescript',
  },
];

export const plugin: ParserPlugin = {
  name: 'typescript-tree-sitter-wasm',
  parsers: [parser],
  supportedFileTypes,
  recommendedLanguageSettings,
};

/** Options for {@link customizePlugin}: the parser's name, and which tagged segments to keep. */
export type CustomizePluginOptions = CustomizeParserOptions;

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
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
