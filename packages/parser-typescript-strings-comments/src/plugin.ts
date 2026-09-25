import type { CustomizeParserOptions, CustomizePluginExOptions, IPluginBuilder, IPluginEx } from '@internal/utils';
import { createPluginEx, customizePluginEx } from '@internal/utils';

import { parser } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginExOptions as CustomizePluginOptions } from '@internal/utils';

export const plugin: IPluginEx = createPluginEx({ name: 'typescript-strings-comments', parsers: [parser] });

export const recommendedLanguageSettings = plugin.languageSettings();

/**
 * Customize {@link plugin}: choose which tagged segments get spell checked. Returns a builder, which works as a
 * plugin and can be customized further.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';
 *
 * // only check doc comments
 * const custom = customizePlugin({ tags: { '*': false, 'comment.block.doc': true } });
 *
 * export default {
 *   plugins: [custom],
 *   languageSettings: custom.languageSettings(),
 * };
 * ```
 */
export function customizePlugin(options?: CustomizePluginExOptions): IPluginBuilder;
/** @deprecated Rename the parser with `customizePlugin().renameParser(...)` instead of `name`. */
export function customizePlugin(options: CustomizeParserOptions): IPluginBuilder;
export function customizePlugin(options?: CustomizePluginExOptions | CustomizeParserOptions): IPluginBuilder {
  return customizePluginEx(plugin, options);
}
