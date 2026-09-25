import type { CustomizePluginExOptions, IPluginBuilder, IPluginEx } from '@internal/utils';
import { createPluginEx, customizePluginEx } from '@internal/utils';

import { parsers } from './parsers.ts';

export type { CustomizePluginExOptions as CustomizePluginOptions } from '@internal/utils';

/** Has one parser per file type: `javascript`, `javascriptreact`, `typescript`, and `typescriptreact`. */
export const plugin: IPluginEx = createPluginEx({ name: 'typescript-tree-sitter', parsers });

export const recommendedLanguageSettings = plugin.languageSettings();

/**
 * Creates a customized copy of {@link plugin}.
 * `options.tags` chooses which tagged segments every parser keeps.
 * The copy can be adjusted further, or turned into a complete config with `defineConfig()`.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-typescript-tree-sitter/plugin';
 *
 * // only check comments
 * export default customizePlugin({ tags: { '*': false, comment: true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginExOptions): IPluginBuilder {
  return customizePluginEx(plugin, options);
}
