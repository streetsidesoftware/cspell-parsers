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
 * Returns a version of {@link plugin} that only spell checks the tagged segments you keep (see
 * {@link CustomizePluginOptions} and the Tags table in the README), and/or registers its parser under a
 * different name - useful when registering more than one customized instance. Works with any cspell
 * version.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-typescript/plugin';
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
