import type { ParseResult } from '@cspell/cspell-types';
import type { CustomizeParserOptions, IParserEx } from '@internal/utils';
import { createPluginParserWithFilterTags, customizeParserEx } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

export type { CustomizeParserOptions } from '@internal/utils';

/**
 * Extracts comments and string/char/raw-string literals from C/C++ source; everything else is tagged
 * `code`. Most consumers won't call this directly; use the `parser`/`plugin` exports, or the
 * `recommended`/`index` settings modules, to wire it into cspell.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['c', 'cpp']);

/** `code` is off by default through `tags`. */
export const parser: IParserEx = createPluginParserWithFilterTags({
  name: 'c-cpp-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});

/**
 * @deprecated Use `plugin.customize()` from `@cspell/parser-c-cpp-strings-comments/plugin` instead.
 *
 * Create a parser for C and C++ files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-c-cpp-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'cpp', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): IParserEx {
  return customizeParserEx(parser, options);
}
