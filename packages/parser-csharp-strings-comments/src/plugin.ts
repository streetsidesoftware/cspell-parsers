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
 * Returns a `Plugin` that spell checks only the tagged segments you keep (see the [Tags](../README.md#tags)
 * table for the available names), and/or registers its parser under a different name. Works with any cspell
 * version.
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
