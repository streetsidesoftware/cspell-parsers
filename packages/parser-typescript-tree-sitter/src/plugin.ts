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
 * Returns a copy of {@link plugin} that spell checks only the tagged segments you choose, and lets you
 * register its parser under a different name. Works with any version of cspell.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-typescript-tree-sitter/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'typescript-comments-only', tags: { '*': false, comment: true } })],
 *   languageSettings: [{ languageId: 'typescript,typescriptreact', parser: 'typescript-comments-only' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
