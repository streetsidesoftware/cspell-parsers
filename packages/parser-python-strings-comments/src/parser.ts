import type { ParseResult } from '@cspell/cspell-types';
import type { PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { Scanner } from './scanner.js';
import { TAGS, tags } from './tags.js';

/**
 * Extracts comments and string literals from Python source; everything else is tagged `code`. Most
 * consumers should register the exported {@link parser} (or a {@link createParser} customization) with
 * cspell rather than calling this directly.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['python']);

export const parser: PluginParser = createPluginParser(
  {
    name: 'python-strings-comments',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /** Overrides the parser's registered name. */
  name?: string;
  /** Tagged segments to keep; omit to keep the parser's own defaults (`code` excluded). */
  tags?: TagFilterOptions;
}

/**
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
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
