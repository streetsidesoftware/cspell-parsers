import type { ParseResult } from '@cspell/cspell-types';
import type { IParser } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/** Extracts comments and string literals from Python source; everything else is tagged `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['python']);

/**
 * This package has one parser.
 * `code` is off by default through `tags`.
 */
export const parsers: readonly IParser[] = [
  createPluginParserWithFilterTags({ name: 'python-strings-comments', parse, supportedFileTypes, tags }),
];
