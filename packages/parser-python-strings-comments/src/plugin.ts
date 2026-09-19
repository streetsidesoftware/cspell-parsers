import type { Plugin } from '@cspell/cspell-types';
import { customizeParser } from '@internal/utils';

import { parser, type CustomizeParserOptions } from './parser.js';

export { supportedFileTypes } from './parser.js';

export const plugin: Plugin = {
  parsers: [parser],
};

/** Options for {@link customizePlugin}: the parser's name, and which tagged segments to keep. */
export type CustomizePluginOptions = CustomizeParserOptions;

/**
 * Returns a {@link Plugin} that only spell checks the tagged segments you choose (see the Tags table in
 * `README.md` for what's available), and, optionally, registers its parser under a different name. Works
 * with any cspell version.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-python-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'python-no-f-strings', tags: { '*': true, 'string.interpolated': false } })], // skip f-strings
 *   languageSettings: [{ languageId: 'python', parser: 'python-no-f-strings' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
