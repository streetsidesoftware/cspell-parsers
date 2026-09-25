import type { ParseResult } from '@cspell/cspell-types/Parser';
import type { IParserEx } from '@internal/utils';
import { createPluginParserWithFilterTags } from '@internal/utils';

import { tags } from './tags.ts';
import type { Grammar } from './walk.ts';
import { collectParsedTexts } from './walk.ts';

/** Returns a parse function that always uses `grammar`, whatever the filename. */
function parseWith(grammar: Grammar): (content: string, filename: string) => ParseResult {
  return (content, filename) => ({ content, filename, parsedTexts: collectParsedTexts(grammar, content) });
}

function createParser(fileType: string, grammar: Grammar): IParserEx {
  return createPluginParserWithFilterTags({
    name: fileType,
    parse: parseWith(grammar),
    supportedFileTypes: [fileType],
    tags,
  });
}

/**
 * One parser per file type, each named after it and using its own grammar.
 * `code` is off by default through `tags`.
 * See docs/ADRs/typescript-parser-split/0003-grammars.md.
 */
export const parsers: readonly IParserEx[] = [
  createParser('javascript', 'javascript'),
  createParser('javascriptreact', 'javascript'),
  createParser('typescript', 'typescript'),
  createParser('typescriptreact', 'tsx'),
];
