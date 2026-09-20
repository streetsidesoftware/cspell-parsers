import type { Plugin } from '@cspell/cspell-types';
import { customizeParser, type ParserPlugin } from '@internal/utils';

import type { CustomizeParserOptions } from './parser.js';
import { parser, supportedFileTypes } from './parser.js';

export { supportedFileTypes } from './parser.js';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'c-cpp-strings-comments',
  },
];

export const plugin: ParserPlugin = {
  name: 'c-cpp-strings-comments',
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
 * import { customizePlugin } from '@cspell/parser-c-cpp-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'c-cpp-only-docs', tags: { '*': false, 'comment.block.doc': true } })], // only check doc comments
 *   languageSettings: [{ languageId: 'cpp', parser: 'c-cpp-only-docs' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
