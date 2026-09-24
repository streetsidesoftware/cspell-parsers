import type { ParseResult } from '@cspell/cspell-types/Parser';
import type { CustomizeParserOptions, IParser } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { TAGS, tags } from './tags.ts';
import { collectParsedTexts } from './walk.ts';

export type { CustomizeParserOptions } from '@internal/utils';

/** Extracts comments, strings, and identifiers from JS/JSX/TS/TSX source; everything else is tagged `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: collectParsedTexts(content, filename) };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze([
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
]);

export const parser: IParser = createPluginParser(
  {
    name: 'typescript',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

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
export function createParser(options: CustomizeParserOptions = {}): IParser {
  return customizeParser(parser, options);
}
