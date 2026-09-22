import type { ParseResult } from '@cspell/cspell-types';
import type { PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { Scanner } from './scanner.js';
import { TAGS, tags } from './tags.js';

/**
 * Extracts comments and string/rune/raw-string literals from Go source, tagging everything else
 * (identifiers, keywords, punctuation, numbers) as plain `code` - so the full file content is covered.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['go']);

export const parser: PluginParser = createPluginParser(
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
  /** Omit to keep every tagged segment. */
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
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
