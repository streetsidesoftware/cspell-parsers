import type { CustomizePluginOptions, IPlugin, IPluginBuilder } from '@internal/utils';
import { createPlugin, customizePluginWith } from '@internal/utils';

import { parsers } from './parsers.ts';

export type { CustomizePluginOptions } from '@internal/utils';

/** Has one parser per file type: `javascript`, `javascriptreact`, `typescript`, and `typescriptreact`. */
export const plugin: IPlugin = createPlugin({ name: 'typescript-tree-sitter-wasm', parsers });

export const recommendedLanguageSettings = plugin.languageSettings();

export const supportedFileTypes: readonly string[] = plugin.supportedFileTypes;

/**
 * Creates a customized copy of {@link plugin}.
 * `options.tags` chooses which tagged segments every parser keeps.
 * The copy can be adjusted further, or turned into a complete config with `defineConfig()`.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';
 *
 * // only check comments
 * export default customizePlugin({ tags: { '*': false, comment: true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder {
  return customizePluginWith(plugin, options);
}
