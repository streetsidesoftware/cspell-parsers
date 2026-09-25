import { plugin as pluginC } from '@cspell/parser-c-cpp-strings-comments/plugin';
import { plugin as pluginCsharp } from '@cspell/parser-csharp-strings-comments/plugin';
import { plugin as pluginGo } from '@cspell/parser-go-strings-comments/plugin';
import { plugin as pluginJava } from '@cspell/parser-java-strings-comments/plugin';
import { plugin as pluginPhp } from '@cspell/parser-php-strings-comments/plugin';
import { plugin as pluginPython } from '@cspell/parser-python-strings-comments/plugin';
import { plugin as pluginRuby } from '@cspell/parser-ruby-strings-comments/plugin';
import { plugin as pluginRust } from '@cspell/parser-rust-strings-comments/plugin';
import { plugin as pluginTypescript } from '@cspell/parser-typescript-strings-comments/plugin';
import type { CustomizeParserOptions, CustomizePluginExOptions, IPluginBuilder, IPluginEx } from '@internal/utils';
import { createPluginEx, customizePluginEx } from '@internal/utils';

export type { CustomizePluginExOptions as CustomizePluginOptions } from '@internal/utils';

const bundledPlugins: readonly IPluginEx[] = [
  pluginC,
  pluginCsharp,
  pluginGo,
  pluginJava,
  pluginPhp,
  pluginPython,
  pluginRuby,
  pluginRust,
  pluginTypescript,
];

export const plugin: IPluginEx = createPluginEx({
  name: 'strings-comments',
  parsers: bundledPlugins.flatMap((p) => p.parsers),
});

export const supportedFileTypes: readonly string[] = plugin.supportedFileTypes;

export const recommendedLanguageSettings = plugin.languageSettings();

/**
 * Creates a customized copy of {@link plugin}.
 * `options.tags` chooses which tagged segments get spell checked, in every bundled language.
 * The copy can be added to `plugins` as it is, or adjusted further first.
 *
 * **`cspell.config.mjs`**
 *
 * ```js
 * import { customizePlugin } from '@cspell/parser-strings-comments/plugin';
 *
 * // only check comments
 * export default customizePlugin({ tags: { '*': false, comment: true } }).defineConfig();
 * ```
 */
export function customizePlugin(options?: CustomizePluginExOptions): IPluginBuilder;
/** @deprecated Rename a parser with `customizePlugin().renameParser(...)` instead of `name`. */
export function customizePlugin(options: CustomizeParserOptions): IPluginBuilder;
/**
 * @deprecated Use `customizePlugin().filterTagsForFileType(fileType, tags, newName)`, or
 * `customizePlugin({ tags })` for every language.
 *
 * Keeps only the parsers that list `fileType`, narrowed to `fileType`, and applies `options.tags`.
 * With `'*'`, it keeps every parser and doesn't rename them.
 */
export function customizePlugin(fileType: string, options: CustomizeParserOptions): IPluginBuilder;
export function customizePlugin(
  fileTypeOrOptions?: string | CustomizePluginExOptions | CustomizeParserOptions,
  options: CustomizeParserOptions = {},
): IPluginBuilder {
  if (typeof fileTypeOrOptions !== 'string') return customizePluginEx(plugin, fileTypeOrOptions);
  return customizeForFileType(fileTypeOrOptions, options);
}

/** Implements the deprecated `customizePlugin(fileType, options)`, reproducing the result of the old bundle. */
function customizeForFileType(fileType: string, options: CustomizeParserOptions): IPluginBuilder {
  const builder = plugin.customize(options.name);
  if (fileType !== '*') {
    const keep = builder.parserNamesFor(fileType);
    builder.removeParser(builder.parserNames().filter((name) => !keep.includes(name)));
    builder.setFileTypes(keep, [fileType]);
    if (options.name !== undefined) {
      for (const name of keep) builder.renameParser(name, options.name);
    }
  }
  if (options.tags) builder.filterTags('*', options.tags);
  return builder;
}
