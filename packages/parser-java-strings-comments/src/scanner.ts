import type { ParsedText, SourceMap } from '@cspell/cspell-types';
import { createCodeTagsEmitter, stripCommentMarkers } from '@internal/utils';

import { TAGS } from './tags.js';

/**
 * Strips a fixed-length opening/closing delimiter pair (quotes) from `rawText`. `hasClose` must come from
 * the scan itself (whether it actually found a closing delimiter, vs. running off the end of the file) -
 * it can't be inferred from `rawText`'s length alone, since a well-formed literal can end exactly at EOF.
 */
function stripDelimited(
  rawText: string,
  openLen: number,
  closeLen: number,
  hasClose: boolean,
): { text: string; map: SourceMap } {
  const contentEnd = hasClose ? rawText.length - closeLen : rawText.length;
  const text = rawText.slice(openLen, contentEnd);
  const map: SourceMap = [openLen, 0];
  if (text.length) map.push(text.length, text.length);
  if (hasClose) map.push(closeLen, 0);
  return { text, map };
}

/**
 * Advances past a backslash escape (`\x` as one unit) without stepping beyond `content.length` - a trailing
 * backslash with nothing after it (an unterminated literal ending mid-escape) has nothing left to escape, so
 * this just lands on the end of `content` instead of one past it.
 */
function skipEscape(content: string, i: number): number {
  return Math.min(i + 2, content.length);
}

/**
 * Scans Java source for comments and character/string/text-block literals (each tagged with its own
 * specific tag), and passes everything else through too - identifiers, keywords, punctuation, numbers,
 * annotations - as `code`, so every byte of the file ends up in exactly one `ParsedText`.
 *
 * `run` fills in the `code`-tagged gaps between what `scanTagged` itself yields via `@internal/utils`'s
 * `createCodeTagsEmitter`, shared with every other package in this rollout rather than each one
 * reimplementing its own trailing-cursor logic.
 *
 * No string interpolation or regex/division ambiguity to resolve here, so `scanTagged` is a single flat loop
 * and every scan method returns exactly one `ParsedText` - no `emitFragment`-style recursion needed.
 */
export class Scanner {
  private i = 0;

  constructor(private readonly content: string) {}

  run(): Iterable<ParsedText> {
    const codeInjector = createCodeTagsEmitter(TAGS.CODE, this.content);
    return codeInjector(this.scanTagged());
  }

  private *scanTagged(): Generator<ParsedText> {
    const { content } = this;

    while (this.i < content.length) {
      const c = content[this.i];
      const n = content[this.i + 1];

      if (c === '/' && n === '/') {
        yield this.scanLineComment();
        continue;
      }
      if (c === '/' && n === '*') {
        yield this.scanBlockComment();
        continue;
      }
      // A `"` starts a text block only when followed by two more `"` characters (a fixed 3-quote opening
      // delimiter); otherwise it falls through to an ordinary `"..."` string. See CONTRIBUTING.md for why
      // the look-ahead needs both extra characters.
      if (c === '"') {
        if (n === '"' && content[this.i + 2] === '"') {
          yield this.scanJavaTextBlock();
        } else {
          yield this.scanQuotedString('"');
        }
        continue;
      }
      if (c === "'") {
        yield this.scanQuotedString("'");
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
    return { text, rawText, map, range: [start, end], tags: TAGS.COMMENT_LINE };
  }

  /** A `/* ... *\/` block comment. `/** ... *\/` (Javadoc) is additionally tagged `comment.block.doc`. */
  private scanBlockComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    const closeIndex = content.indexOf('*/', start + 2);
    const end = closeIndex === -1 ? content.length : closeIndex + 2;
    const rawText = content.slice(start, end);
    const isDoc = rawText.startsWith('/**') && rawText.length >= 5;
    const { text, map } = stripCommentMarkers(rawText);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: isDoc ? TAGS.COMMENT_BLOCK_DOC : TAGS.COMMENT_BLOCK };
  }

  /** A plain `'...'` char literal or `"..."` string literal - no interpolation in either form. */
  private scanQuotedString(quote: string): ParsedText {
    const { content } = this;
    const start = this.i;
    let i = start + 1;
    let closed = false;
    while (i < content.length) {
      if (content[i] === quote) {
        closed = true;
        break;
      }
      if (content[i] === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      i++;
    }
    const end = closed ? i + 1 : i;
    const rawText = content.slice(start, end);
    const tag = quote === "'" ? TAGS.STRING_SINGLE : TAGS.STRING_DOUBLE;
    const { text, map } = stripDelimited(rawText, 1, 1, closed);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: tag };
  }

  /** A Java 15+ text block: `"""..."""`, a fixed 3-quote delimiter on both ends. */
  private scanJavaTextBlock(): ParsedText {
    const { content } = this;
    const start = this.i;
    let i = start + 3;
    let closed = false;
    while (i < content.length) {
      if (content[i] === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      if (content[i] === '"' && content[i + 1] === '"' && content[i + 2] === '"') {
        i += 3;
        closed = true;
        break;
      }
      i++;
    }
    const end = i;
    const rawText = content.slice(start, end);
    const { text, map } = stripDelimited(rawText, 3, 3, closed);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: TAGS.STRING_TEXT_BLOCK };
  }
}
