import type { CustomizePluginExOptions, IPluginBuilder, IPluginEx } from '@internal/utils';
import { createPluginEx, customizePluginEx } from '@internal/utils';

import { parser } from './parser.ts';

export { supportedFileTypes } from './parser.ts';
export type { CustomizePluginExOptions as CustomizePluginOptions } from '@internal/utils';

export const plugin: IPluginEx = createPluginEx({ name: 'csharp-strings-comments', parsers: [parser] });

export const recommendedLanguageSettings = plugin.languageSettings();

/**
 * Creates a customized copy of {@link plugin}.
 * `options.tags` chooses which tagged segments get spell checked.
 * The copy can be added to `plugins` as it is, or adjusted further first.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-csharp-strings-comments/plugin';
 *
 * // only check XML doc comments
 * export default customizePlugin({ tags: { '*': false, 'comment.line.doc': true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginExOptions): IPluginBuilder {
  return customizePluginEx(plugin, options);
}
