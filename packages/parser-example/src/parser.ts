import type { ParsedTags, ParsedText, Parser, ParseResult } from '@cspell/cspell-types';

const COMMENT_TAG = { comment: true };
const COMMENT_LINE_TAG = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_BLOCK_TAG = { ...COMMENT_TAG, 'comment.block': true };
const COMMENT_BLOCK_DOC_TAG = { ...COMMENT_BLOCK_TAG, 'comment.block.doc': true };

function commentTag(text: string): ParsedTags {
  return text.startsWith('//') ? COMMENT_LINE_TAG : text.startsWith('/**') ? COMMENT_BLOCK_DOC_TAG : COMMENT_BLOCK_TAG;
}

/**
 * Extracts C-style comments - `//` line comments and `/*`-delimited block comments - from
 * arbitrary source text, so only comment text (not code) gets spell checked. A single-pass scan,
 * skipping over quoted string contents so a comment marker inside a string literal isn't mistaken
 * for the start of a real comment.
 */
export function parse(content: string, filename: string): ParseResult {
  const parsedTexts: ParsedText[] = [];
  let i = 0;

  while (i < content.length) {
    const twoChars = content.slice(i, i + 2);

    if (twoChars === '//') {
      const newlineIndex = content.indexOf('\n', i);
      const end = newlineIndex === -1 ? content.length : newlineIndex;
      const text = content.slice(i, end);
      parsedTexts.push({ text, range: [i, end], tags: commentTag(text) });
      i = end;
      continue;
    }

    if (twoChars === '/*') {
      const closeIndex = content.indexOf('*/', i + 2);
      const end = closeIndex === -1 ? content.length : closeIndex + 2;
      const text = content.slice(i, end);
      parsedTexts.push({ text, range: [i, end], tags: commentTag(text) });
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

export const parser: Parser = {
  name: 'c-style-comments',
  parse,
};

export const supportedFileTypes: string[] = ['c', 'cpp', 'csharp', 'java', 'javascript', 'typescript'];
