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
 * A version of {@link plugin} that only spell checks the tagged segments you choose, optionally under a
 * different parser name. Works with any cspell version.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'php-no-markup', tags: { '*': true, markup: false } })], // skip HTML outside <?php ?>
 *   languageSettings: [{ languageId: 'php', parser: 'php-no-markup' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
