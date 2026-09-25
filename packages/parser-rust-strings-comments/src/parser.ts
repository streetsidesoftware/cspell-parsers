import type { ParseResult } from '@cspell/cspell-types';
import type { CustomizeParserOptions, IParserEx } from '@internal/utils';
import { createPluginParserWithFilterTags, customizeParserEx } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

export type { CustomizeParserOptions } from '@internal/utils';

/** Extracts comments and string literals from Rust source; everything else is tagged `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['rust']);

/** `code` is off by default through `tags`. */
export const parser: IParserEx = createPluginParserWithFilterTags({
  name: 'rust-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});

/**
 * @deprecated Use `plugin.customize()` from `@cspell/parser-rust-strings-comments/plugin` instead.
 *
 * Create a parser for Rust files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-rust-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'rust', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): IParserEx {
  return customizeParserEx(parser, options);
}
