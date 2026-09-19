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
 * Create a customized copy of {@link plugin} - rename its parser and/or choose which tagged segments get
 * spell checked. Works with any cspell version.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-csharp-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'csharp-only-docs', tags: { '*': false, 'comment.line.doc': true } })], // only check XML doc comments
 *   languageSettings: [{ languageId: 'csharp', parser: 'csharp-only-docs' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
