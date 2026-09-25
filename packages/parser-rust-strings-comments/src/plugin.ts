import type { CustomizeParserOptions, CustomizePluginExOptions, IPluginBuilder, IPluginEx } from '@internal/utils';
import { createPluginEx, customizePluginEx } from '@internal/utils';

import { parser } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginExOptions as CustomizePluginOptions } from '@internal/utils';

export const plugin: IPluginEx = createPluginEx({ name: 'rust-strings-comments', parsers: [parser] });

export const recommendedLanguageSettings = plugin.languageSettings();

/**
 * Creates a customized copy of {@link plugin}.
 * `options.tags` chooses which tagged segments get spell checked.
 * The copy can be added to `plugins` as it is, or adjusted further first.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';
 *
 * // only check doc comments
 * export default customizePlugin({ tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginExOptions): IPluginBuilder;
/** @deprecated Rename the parser with `customizePlugin().renameParser(...)` instead of `name`. */
export function customizePlugin(options: CustomizeParserOptions): IPluginBuilder;
export function customizePlugin(options?: CustomizePluginExOptions | CustomizeParserOptions): IPluginBuilder {
  return customizePluginEx(plugin, options);
}
