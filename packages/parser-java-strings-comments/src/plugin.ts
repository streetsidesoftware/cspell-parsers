import type { CustomizePluginOptions, IPlugin, IPluginBuilder } from '@internal/utils';
import { createPlugin, customizePluginWith } from '@internal/utils';

import { parsers } from './parsers.ts';

export type { CustomizePluginOptions } from '@internal/utils';

export const plugin: IPlugin = createPlugin({ name: 'java-strings-comments', parsers });

export const supportedFileTypes: readonly string[] = plugin.supportedFileTypes;

export const recommendedLanguageSettings = plugin.languageSettings();

/**
 * Creates a customized copy of {@link plugin}.
 * `options.tags` chooses which tagged segments get spell checked.
 * The copy can be added to `plugins` as it is, or adjusted further first.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-java-strings-comments/plugin';
 *
 * // only check Javadoc comments
 * export default customizePlugin({ tags: { '*': false, 'comment.block.doc': true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder {
  return customizePluginWith(plugin, options);
}
