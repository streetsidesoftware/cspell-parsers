import type { Plugin } from '@cspell/cspell-types';
import { customizeParser } from '@internal/utils';

import type { CustomizeParserOptions } from './parser.js';
import { parser } from './parser.js';

export { supportedFileTypes } from './parser.js';

export const plugin: Plugin = {
  parsers: [parser],
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
 * import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';
 *
 * export default {
 *   plugins: [
 *     customizePlugin({
 *       name: 'rust-only-docs',
 *       tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true },
 *     }), // only check doc comments
 *   ],
 *   languageSettings: [{ languageId: 'rust', parser: 'rust-only-docs' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
