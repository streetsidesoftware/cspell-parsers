import type { CustomizePluginExOptions, IPluginBuilder, IPluginEx } from '@internal/utils';
import { createPluginEx, customizePluginEx } from '@internal/utils';

import { parsers } from './parsers.ts';

export type { CustomizePluginExOptions as CustomizePluginOptions } from '@internal/utils';

/** Has two parsers: `javascript-strings-comments` for JavaScript and JSX, and `typescript-strings-comments` for TypeScript and TSX. */
export const plugin: IPluginEx = createPluginEx({ name: 'typescript-strings-comments', parsers });

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
 * import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';
 *
 * // only check doc comments
 * export default customizePlugin({ tags: { '*': false, 'comment.block.doc': true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginExOptions): IPluginBuilder {
  return customizePluginEx(plugin, options);
}
