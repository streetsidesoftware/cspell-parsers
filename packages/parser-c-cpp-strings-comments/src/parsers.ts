import type { ParseResult } from '@cspell/cspell-types';
import type { IParser } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/**
 * Extracts comments and string/char/raw-string literals from C/C++ source; everything else is tagged
 * `code`. Most consumers won't call this directly; use the `parser`/`plugin` exports, or the
 * `recommended`/`index` settings modules, to wire it into cspell.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['c', 'cpp']);

/**
 * This package has one parser.
 * `code` is off by default through `tags`.
 */
export const parsers: readonly IParser[] = [
  createPluginParserWithFilterTags({ name: 'c-cpp-strings-comments', parse, supportedFileTypes, tags }),
];
