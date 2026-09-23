import type { ParsedText } from '@cspell/cspell-types';
import { stripCommentMarkers } from '@internal/utils';

import { TAGS, type Tags } from './tags.ts';

function commentTag(text: string): Tags {
  return text.startsWith('//')
    ? TAGS.COMMENT_LINE
    : text.startsWith('/**')
      ? TAGS.COMMENT_BLOCK_DOC
      : TAGS.COMMENT_BLOCK;
}

/**
 * Scans C-style source for `//` line comments and `/* ... *\/` block comments, yielding one `ParsedText` per
 * comment and skipping everything else, including quoted string contents - so a comment marker inside a
 * string literal isn't mistaken for the start of a real comment.
 *
 * Emits lazily via a generator rather than an array - nothing here needs eager draining to release a resource.
 */
export class Scanner {
  private i = 0;

  constructor(private readonly content: string) {}

  *run(): Generator<ParsedText> {
    const { content } = this;

    while (this.i < content.length) {
      const twoChars = content.slice(this.i, this.i + 2);

      if (twoChars === '//') {
        yield this.scanLineComment();
        continue;
      }
      if (twoChars === '/*') {
        yield this.scanBlockComment();
        continue;
      }

      const char = content[this.i];
      if (char === '"' || char === "'" || char === '`') {
        this.skipStringLiteral(char);
        continue;
      }

      this.i++;
    }
  }

  private scanLineComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    const newlineIndex = content.indexOf('\n', start);
    const end = newlineIndex === -1 ? content.length : newlineIndex;
    const rawText = content.slice(start, end);
    const { text, map } = stripCommentMarkers(rawText);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: commentTag(rawText) };
  }

  private scanBlockComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    const closeIndex = content.indexOf('*/', start + 2);
    const end = closeIndex === -1 ? content.length : closeIndex + 2;
    const rawText = content.slice(start, end);
    const { text, map } = stripCommentMarkers(rawText);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: commentTag(rawText) };
  }

  /** Advances past a `quote`-delimited string literal, treating `\x` as one escaped character. */
  private skipStringLiteral(quote: string): void {
    const { content } = this;
    let i = this.i + 1;
    while (i < content.length && content[i] !== quote) {
      i += content[i] === '\\' ? 2 : 1;
    }
    this.i = i + 1;
  }
}
