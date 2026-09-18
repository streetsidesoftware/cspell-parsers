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
 * spell checked. Filtering happens in the parser itself, before cspell ever sees the excluded segments, so
 * it works with any cspell version.
 *
 * Usage: **`cspell.config.mjs`** (needs a JS/TS config file - `.mjs`/`.ts`/`.cjs` - since this returns a live
 * `Plugin` object rather than a module-specifier string)
 * ```js
 * import { customizePlugin } from '@cspell/parser-strings-comments/plugin';
 *
 * export default {
 *   // only check doc comments (JSDoc/Javadoc/PHPDoc-style "/**" blocks and C#'s "///" lines)
 *   plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true, 'comment.line.doc': true } })],
 *   languageSettings: [{ languageId: 'csharp', parser: 'strings-comments' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
