import type { ParseResult } from '@cspell/cspell-types';
import type { IParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { TAGS, tags } from './tags.ts';

/** Extracts comments and character/string/text-block literals from Java source, tagging everything else as `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['java']);

export const parser: IParser = createPluginParser(
  {
    name: 'java-strings-comments',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /**
   * Overrides the parser's registered name. Defaults to `java-strings-comments`.
   */
  name?: string;
  /**
   * Which tagged segments to keep. Omit to keep the parser's own defaults (`code` excluded).
   */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for Java files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-java-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'javadoc-only',
 *   tags: { '*': false, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'java', parser: 'javadoc-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): IParser {
  return customizeParser(parser, options);
}
