import { plugin as typescriptPlugin } from '@cspell/parser-typescript/plugin';
import type { CustomizePluginOptions, IPlugin, IPluginBuilder } from '@internal/utils';

export type { CustomizePluginOptions } from '@internal/utils';

/**
 * Names the parsers this plugin keeps.
 * Any other parser `@cspell/parser-typescript` has, now or later, is left out.
 */
const javascriptParserNames: readonly string[] = ['javascript', 'javascriptreact'];

/**
 * Has `@cspell/parser-typescript`'s `javascript` and `javascriptreact` parsers, the same objects under the same names.
 * Built with that package's own builder, so this package doesn't bundle a second copy of `@internal/utils`.
 * See docs/ADRs/typescript-parser-split/0004-parser-javascript.md.
 */
export const plugin: IPlugin = typescriptPlugin
  .customize('javascript')
  .removeParser(typescriptPlugin.parserNames().filter((name) => !javascriptParserNames.includes(name)))
  .build();

export const recommendedLanguageSettings = plugin.languageSettings();

/**
 * Creates a customized copy of {@link plugin}.
 * `options.tags` chooses which tagged segments both parsers keep.
 * The copy can be adjusted further, or turned into a complete config with `defineConfig()`.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-javascript/plugin';
 *
 * // only check comments
 * export default customizePlugin({ tags: { '*': false, comment: true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginOptions): IPluginBuilder {
  // Rejected at runtime too, since the old API took `name` and a JS config wouldn't see the type error.
  if (options?.name !== undefined) {
    throw new Error(`"name" isn't supported; use renameParser instead (plugin "${plugin.name}").`);
  }
  const builder = plugin.customize();
  return options?.tags ? builder.filterTags('*', options.tags) : builder;
}
