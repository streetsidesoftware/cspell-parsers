import type { ParseResult } from '@cspell/cspell-types';
import type { PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { TAGS, tags } from './tags.ts';

/**
 * Extracts C-style comments - `//` line comments and `/*`-delimited block comments - from arbitrary source
 * text, tagging everything else (including string literals) as `code`.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze([
  'c',
  'cpp',
  'csharp',
  'java',
  'javascript',
  'typescript',
]);

export const parser: PluginParser = createPluginParser(
  {
    name: 'c-style-comments',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /** Overrides the parser's name (defaults to `c-style-comments`). */
  name?: string;
  /** Which tagged segments to keep. Omit to keep the parser's own defaults (`code` excluded). */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for C, C++, C#, Java, JavaScript, and TypeScript files. You can set the name of the
 * parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-example/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'c,cpp', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
