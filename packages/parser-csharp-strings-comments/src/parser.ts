import type { ParseResult } from '@cspell/cspell-types';
import type { PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { Scanner } from './scanner.js';
import { tags } from './tags.js';

/**
 * cspell `Parser.parse` implementation for C#: returns the file's comments and string/character literals for
 * spell checking, skipping everything else (identifiers, keywords, punctuation, numbers).
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['csharp']);

export const parser: PluginParser = createPluginParser({
  name: 'csharp-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /**
   * Set the name of the parser.
   */
  name?: string;
  /**
   * Define which tagged segments to keep. Omit to keep everything.
   */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for C# files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-csharp-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.line.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'csharp', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
