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
 * Returns a version of {@link plugin} that only spell checks the tagged segments you choose - for example,
 * only doc comments - and/or registers its parser under a different name. Works with any cspell version.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'typescript-only-docs', tags: { '*': false, 'comment.block.doc': true } })], // only check doc comments
 *   languageSettings: [{ languageId: 'typescript', parser: 'typescript-only-docs' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
