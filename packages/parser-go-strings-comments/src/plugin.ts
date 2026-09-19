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
 * Returns a version of {@link plugin} with its parser registered under a different name and/or restricted to
 * only the tagged segments you choose to keep - use it to spell check just some kinds of segments (for
 * example, only string literals). This filtering works with any cspell version, since cspell itself never
 * sees the excluded segments.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-go-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'go-strings-only', tags: { '*': false, string: true } })], // only check string/rune literals
 *   languageSettings: [{ languageId: 'go', parser: 'go-strings-only' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
