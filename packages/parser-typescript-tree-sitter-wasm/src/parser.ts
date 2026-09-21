import type { ParseResult } from '@cspell/cspell-types/Parser';
import type { PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { tags } from './tags.js';
import { collectParsedTexts } from './walk.js';

export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: collectParsedTexts(content, filename) };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze([
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
]);

export const parser: PluginParser = createPluginParser({
  name: 'typescript',
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
 * Create a parser for TypeScript, TSX, JavaScript, and JSX files. You can set the name of the parser and
 * filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-typescript-tree-sitter-wasm/parser';
 *
 * const parser = createParser({
 *   name: 'typescript-comments-only',
 *   tags: { '*': false, comment: true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'typescript', parser: 'typescript-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
