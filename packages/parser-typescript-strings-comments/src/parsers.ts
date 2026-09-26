import type { ParseResult } from '@cspell/cspell-types';
import type { IParser } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/** Extracts comments and string/template literals from JS/JSX/TS/TSX source; everything else is tagged `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

function createParser(name: string, supportedFileTypes: readonly string[]): IParser {
  return createPluginParserWithFilterTags({ name, parse, supportedFileTypes, tags });
}

/**
 * One parser for JavaScript and JSX, and one for TypeScript and TSX, sharing the same scanner.
 * `code` is off by default through `tags`.
 */
export const parsers: readonly IParser[] = [
  createParser('javascript-strings-comments', ['javascript', 'javascriptreact']),
  createParser('typescript-strings-comments', ['typescript', 'typescriptreact']),
];
