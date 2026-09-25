import type { CustomizeParserOptions, CustomizePluginExOptions, IPluginBuilder, IPluginEx } from '@internal/utils';
import { createPluginEx, customizePluginEx } from '@internal/utils';

import { parser } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginExOptions as CustomizePluginOptions } from '@internal/utils';

export const plugin: IPluginEx = createPluginEx({ name: 'ruby-strings-comments', parsers: [parser] });

export const recommendedLanguageSettings = plugin.languageSettings();

/**
 * Creates a customized copy of {@link plugin}.
 * `options.tags` chooses which tagged segments get spell checked.
 * The copy can be added to `plugins` as it is, or adjusted further first.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';
 *
 * // skip heredocs, which often hold SQL or other text
 * export default customizePlugin({ tags: { 'string.heredoc': false } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginExOptions): IPluginBuilder;
/** @deprecated Rename the parser with `customizePlugin().renameParser(...)` instead of `name`. */
export function customizePlugin(options: CustomizeParserOptions): IPluginBuilder;
export function customizePlugin(options?: CustomizePluginExOptions | CustomizeParserOptions): IPluginBuilder {
  return customizePluginEx(plugin, options);
}
