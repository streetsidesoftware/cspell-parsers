import type { ParseResult } from '@cspell/cspell-types';
import type { IParser } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/**
 * Parses PHP source, tagging its comments, string/heredoc/nowdoc literals, and the HTML markup surrounding
 * `<?php ... ?>` regions with their own specific tags, and everything else (identifiers, keywords,
 * punctuation, numbers, tag delimiters) as plain `code` - so the full file content is covered.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['php']);

/** Both `code` and `html` are off by default through `tags`. */
export const parser: IParser = createPluginParserWithFilterTags({
  name: 'php-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});
