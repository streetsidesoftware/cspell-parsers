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
 * Register this instead of {@link plugin} to control which tagged segments get spell checked, and/or to
 * give the registered parser a different name. Segments outside the given filter are excluded before cspell
 * ever sees them, so this works with any cspell version - no need for cspell itself to support tag-based
 * filtering.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';
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
