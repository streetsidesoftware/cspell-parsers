import type { ParseResult } from '@cspell/cspell-types';
import type { IParser } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/** cspell `Parser.parse` implementation for C#: returns comments and string/character literals, tagging everything else as `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['csharp']);

/** `code` is off by default through `tags`. */
export const parser: IParser = createPluginParserWithFilterTags({
  name: 'csharp-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});
