import type { ParsedText, SourceMap } from '@cspell/cspell-types';
import { createCodeTagsEmitter, stripCommentMarkers } from '@internal/utils';

import { TAGS } from './tags.js';

/**
 * Strips a fixed-length opening/closing delimiter pair (quotes/backticks) from `rawText`. `hasClose` must
 * come from the scan itself (whether it actually found a closing delimiter, vs. running off the end of the
 * file) - it can't be inferred from `rawText`'s length alone, since a well-formed literal can end exactly at
 * EOF.
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
 * Scans Go source for comments and string/rune/raw-string literals (each tagged with its own specific tag),
 * and passes everything else through too - identifiers, keywords, punctuation, numbers - as `code`, so every
 * byte of the file ends up in exactly one `ParsedText`.
 *
 * `run` fills in the `code`-tagged gaps between what `scanTagged` itself yields via `@internal/utils`'s
 * `createCodeTagsEmitter`, shared with every other package in this rollout rather than each one
 * reimplementing its own trailing-cursor logic.
 *
 * Go has no template-literal-style interpolation and no regex-literal-vs-division ambiguity to resolve, so
 * unlike the JS/TS-family scanner this is split from, no construct here ever splits into multiple fragments
 * or needs lookahead/lookbehind - each scan method below emits exactly one `ParsedText`.
 *
 * Emits lazily via a generator rather than an array - nothing here needs eager draining to release a resource.
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
      if (c === '`') {
        yield this.scanGoRawString();
        continue;
      }
      if (c === '"' || c === "'") {
        yield this.scanQuotedString(c);
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

  /** A `'...'` rune literal or `"..."` interpreted string literal - both use the same backslash-escape rules. */
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

  /**
   * A Go raw string literal (`` `...` ``): no escapes and no interpolation. Go's own grammar disallows a
   * literal backtick inside a raw string at all, so the next backtick is unambiguously the close, with
   * nothing to skip over - notably simpler than a JS/TS template literal's backtick handling, which also has
   * to watch for `${...}` interpolation holes.
   */
  private scanGoRawString(): ParsedText {
    const { content } = this;
    const start = this.i;
    const closeIndex = content.indexOf('`', start + 1);
    const closed = closeIndex !== -1;
    const end = closed ? closeIndex + 1 : content.length;
    const rawText = content.slice(start, end);
    const { text, map } = stripDelimited(rawText, 1, 1, closed);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: TAGS.STRING_RAW };
  }
}
