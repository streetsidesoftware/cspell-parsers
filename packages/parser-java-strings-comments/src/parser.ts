import type { ParseResult } from '@cspell/cspell-types';
import type { IParserEx } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/** Extracts comments and character/string/text-block literals from Java source, tagging everything else as `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['java']);

/** `code` is off by default through `tags`. */
export const parser: IParserEx = createPluginParserWithFilterTags({
  name: 'java-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});
