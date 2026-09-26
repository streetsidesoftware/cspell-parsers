import type { ParseResult } from '@cspell/cspell-types';
import type { IParser } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/**
 * Extracts comments and string/heredoc literals from Ruby source; everything else is tagged `code`. See
 * the `Scanner` class for the actual scanning logic.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['ruby']);

/** `code` is off by default through `tags`. */
export const parser: IParser = createPluginParserWithFilterTags({
  name: 'ruby-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});
