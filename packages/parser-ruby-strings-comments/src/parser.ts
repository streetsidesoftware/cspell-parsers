import type { ParseResult } from '@cspell/cspell-types';
import type { IParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { TAGS, tags } from './tags.ts';

/**
 * Extracts comments and string/heredoc literals from Ruby source; everything else is tagged `code`. See
 * the `Scanner` class for the actual scanning logic.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['ruby']);

export const parser: IParser = createPluginParser(
  {
    name: 'ruby-strings-comments',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /**
   * Set the name of the parser.
   */
  name?: string;
  /**
   * Define which tagged segments to keep. Omit to keep the parser's own defaults (`code` excluded).
   */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for Ruby files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-ruby-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'no-heredocs',
 *   tags: { 'string.heredoc': false },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'ruby', parser: 'no-heredocs' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): IParser {
  return customizeParser(parser, options);
}
