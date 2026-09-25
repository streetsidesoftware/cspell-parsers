import type { ParseResult } from '@cspell/cspell-types';
import type { CustomizeParserOptions, IParserEx } from '@internal/utils';
import { createPluginParserWithFilterTags, customizeParserEx } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

export type { CustomizeParserOptions } from '@internal/utils';

/**
 * Extracts comments and string literals from Python source; everything else is tagged `code`. Most
 * consumers should register the exported {@link parser} (or a {@link createParser} customization) with
 * cspell rather than calling this directly.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['python']);

/** `code` is off by default through `tags`. */
export const parser: IParserEx = createPluginParserWithFilterTags({
  name: 'python-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});

/**
 * @deprecated Use `plugin.customize()` from `@cspell/parser-python-strings-comments/plugin` instead.
 *
 * Create a parser for Python files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * ```ts
 * // cspell.config.mts
 * import { createParser } from '@cspell/parser-python-strings-comments/parser';
 *
 * const parser = createParser({ name: 'strings-only', tags: { '*': false, string: true } });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'python', parser: 'strings-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): IParserEx {
  return customizeParserEx(parser, options);
}
