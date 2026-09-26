import type { ParseResult } from '@cspell/cspell-types';
import type { IParserEx } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

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

/** `code` is off by default through `tags`. */
export const parser: IParserEx = createPluginParserWithFilterTags({
  name: 'c-style-comments',
  parse,
  supportedFileTypes,
  tags,
});
