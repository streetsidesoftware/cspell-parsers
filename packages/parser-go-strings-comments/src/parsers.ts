import type { ParseResult } from '@cspell/cspell-types';
import type { IParser } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/** Extracts comments and string/rune/raw-string literals from Go source, tagging everything else as `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['go']);

/**
 * This package has one parser.
 * `code` is off by default through `tags`.
 */
export const parsers: readonly IParser[] = [
  createPluginParserWithFilterTags({ name: 'go-strings-comments', parse, supportedFileTypes, tags }),
];
