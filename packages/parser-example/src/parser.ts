import type { ParsedText, ParseResult } from '@cspell/cspell-types';
import type { PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser, stripCommentMarkers } from '@internal/utils';

import { TAGS, type Tags, tags } from './tags.js';

function commentTag(text: string): Tags {
  return text.startsWith('//')
    ? TAGS.COMMENT_LINE
    : text.startsWith('/**')
      ? TAGS.COMMENT_BLOCK_DOC
      : TAGS.COMMENT_BLOCK;
}

/**
 * Extracts C-style comments - `//` line comments and `/*`-delimited block comments - from
 * arbitrary source text, so only comment text (not code) gets spell checked. Quoted string
 * contents are skipped, so a comment marker inside a string literal isn't mistaken for the
 * start of a real comment.
 */
export function parse(content: string, filename: string): ParseResult {
  const parsedTexts: ParsedText[] = [];
  let i = 0;

  while (i < content.length) {
    const twoChars = content.slice(i, i + 2);

    if (twoChars === '//') {
      const newlineIndex = content.indexOf('\n', i);
      const end = newlineIndex === -1 ? content.length : newlineIndex;
      const rawText = content.slice(i, end);
      const { text, map } = stripCommentMarkers(rawText);
      parsedTexts.push({ text, rawText, map, range: [i, end], tags: commentTag(rawText) });
      i = end;
      continue;
    }

    if (twoChars === '/*') {
      const closeIndex = content.indexOf('*/', i + 2);
      const end = closeIndex === -1 ? content.length : closeIndex + 2;
      const rawText = content.slice(i, end);
      const { text, map } = stripCommentMarkers(rawText);
      parsedTexts.push({ text, rawText, map, range: [i, end], tags: commentTag(rawText) });
      i = end;
      continue;
    }

    const char = content[i];
    if (char === '"' || char === "'" || char === '`') {
      i = skipStringLiteral(content, i, char);
      continue;
    }

    i++;
  }

  return { content, filename, parsedTexts };
}

/** Returns the index just past the closing `quote`, treating `\x` as one escaped character. */
function skipStringLiteral(content: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < content.length && content[i] !== quote) {
    i += content[i] === '\\' ? 2 : 1;
  }
  return i + 1;
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze([
  'c',
  'cpp',
  'csharp',
  'java',
  'javascript',
  'typescript',
]);

export const parser: PluginParser = createPluginParser({
  name: 'c-style-comments',
  parse,
  supportedFileTypes,
  tags,
});

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /** Overrides the parser's name (defaults to `c-style-comments`). */
  name?: string;
  /** Which tagged segments to keep. Omit to keep everything. */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for C, C++, C#, Java, JavaScript, and TypeScript files. You can set the name of the
 * parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-example/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'c,cpp', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
