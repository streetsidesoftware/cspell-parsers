import type { Plugin } from '@cspell/cspell-types';
import { customizeParser, type ParserPlugin } from '@internal/utils';

import type { CustomizeParserOptions } from './parser.ts';
import { parser, supportedFileTypes } from './parser.ts';

export { supportedFileTypes } from './parser.ts';

export const recommendedLanguageSettings = [
  {
    languageId: supportedFileTypes.join(','),
    parser: 'php-strings-comments',
  },
];

export const plugin: ParserPlugin = {
  name: 'php-strings-comments',
  parsers: [parser],
  supportedFileTypes,
  recommendedLanguageSettings,
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
 * import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';
 *
 * export default {
 *   plugins: [customizePlugin({ name: 'php-with-html', tags: { html: true } })], // also check HTML outside <?php ?>
 *   languageSettings: [{ languageId: 'php', parser: 'php-with-html' }],
 * };
 * ```
 */
export function customizePlugin(options: CustomizePluginOptions): Plugin {
  return { ...plugin, parsers: [customizeParser(parser, options)] };
}
