import type { ParseResult } from '@cspell/cspell-types';
import type { IParserEx } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

/** Extracts comments and string/template literals from JS/JSX/TS/TSX source; everything else is tagged `code`. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze([
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
]);

/** `code` is off by default through `tags`. */
export const parser: IParserEx = createPluginParserWithFilterTags({
  name: 'typescript-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});
