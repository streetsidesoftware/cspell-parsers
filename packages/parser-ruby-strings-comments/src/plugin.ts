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
 * spell checked. Filtering happens in the parser itself, before cspell ever sees the excluded segments, so
 * it works with any cspell version.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ tags: { 'string.heredoc': false } })], // exclude heredocs - often SQL/text blobs
 *   languageSettings: [{ languageId: 'ruby', parser: 'ruby-strings-comments' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
