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
 * Returns a {@link Plugin} that only spell checks segments matching the given tag filter (see the "Tags"
 * table in `README.md`), optionally registered under a new parser name. Works with any cspell version.
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
