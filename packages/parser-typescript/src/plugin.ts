import { plugin as wasmPlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';
import type { CustomizePluginOptions, IPlugin, IPluginBuilder } from '@internal/utils';

export type { CustomizePluginOptions } from '@internal/utils';

/**
 * Has one parser per file type: `javascript`, `javascriptreact`, `typescript`, and `typescriptreact`.
 * The parsers are `@cspell/parser-typescript-tree-sitter-wasm`'s.
 * Built with that package's own builder, so this package doesn't bundle a second copy of `@internal/utils`.
 */
export const plugin: IPlugin = wasmPlugin.customize('typescript').build();

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
 * import { customizePlugin } from '@cspell/parser-typescript/plugin';
 *
 * // only check comments
 * export default customizePlugin({ tags: { '*': false, comment: true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder {
  // Runtime checks for JS configs, the same as `customizePluginWith`'s.
  // They're inline so this package doesn't bundle `@internal/utils` code.
  if (options !== undefined && typeof options !== 'object') {
    throw new Error(
      `customizePlugin takes an options object; for one file type, use customizePlugin().filterTagsForFileType(...) (plugin "${plugin.name}").`,
    );
  }
  if (options?.name !== undefined) {
    throw new Error(`"name" isn't supported; use renameParser instead (plugin "${plugin.name}").`);
  }
  const builder = plugin.customize();
  return options?.tags ? builder.filterTags('*', options.tags) : builder;
}
