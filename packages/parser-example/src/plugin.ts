import type { Plugin } from '@cspell/cspell-types';
import { customizeParserPlugin, type ParserPlugin } from '@internal/utils';

import type { CustomizeParserOptions } from './parser.ts';
import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'c-style-comments',
  },
];

export const plugin: ParserPlugin = {
  name: 'example',
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
 * import { customizePlugin } from '@cspell/parser-example/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'doc-comments-only', tags: { '*': false, 'comment.block.doc': true } })],
 *   languageSettings: [{ languageId: 'c,cpp', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return customizeParserPlugin(plugin, options);
}
