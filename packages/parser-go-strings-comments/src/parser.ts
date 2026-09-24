import type { ParseResult } from '@cspell/cspell-types';
import type { IParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { TAGS, tags } from './tags.ts';

/** Extracts comments and string/rune/raw-string literals from Go source, tagging everything else as `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['go']);

export const parser: IParser = createPluginParser(
  {
    name: 'go-strings-comments',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

/** Options for {@link createParser}. */
export interface CustomizeParserOptions {
  name?: string;
  /** Omit to keep the parser's own defaults (`code` excluded). */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for Go files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-go-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'strings-only',
 *   tags: { '*': false, string: true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'go', parser: 'strings-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): IParser {
  return customizeParser(parser, options);
}
