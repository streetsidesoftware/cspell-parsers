import type { ParseResult } from '@cspell/cspell-types';
import type { PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { TAGS, tags } from './tags.ts';

/**
 * Parses PHP source, tagging its comments, string/heredoc/nowdoc literals, and the HTML markup surrounding
 * `<?php ... ?>` regions with their own specific tags, and everything else (identifiers, keywords,
 * punctuation, numbers, tag delimiters) as plain `code` - so the full file content is covered.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['php']);

export const parser: PluginParser = createPluginParser(
  {
    name: 'php-strings-comments',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /** Parser name to register under. */
  name?: string;
  /** Which tagged segments to keep; omit to keep everything. */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for PHP files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-php-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'php-code-only',
 *   tags: { '*': false, string: true, comment: true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'php', parser: 'php-code-only' }],
 * };
 * ```
 */
export function createParser(options?: CustomizeParserOptions): PluginParser {
  return options ? parser.customize(options) : parser;
}
