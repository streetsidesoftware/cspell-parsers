import type { ParsedText, SourceMap } from '@cspell/cspell-types';
import { createCodeTagsEmitter, stripCommentMarkers } from '@internal/utils';

import { TAGS } from './tags.ts';

/**
 * Strips a line comment's marker and one following space, if present. Takes the marker's length explicitly
 * (unlike `@internal/utils`'s `stripCommentMarkers`) since this scanner has two marker lengths: plain `//`
 * (2) vs. doc `///`/`//!` (3).
 */
function stripLineMarker(rawText: string, markerLen: number): { text: string; map: SourceMap } {
  let skip = markerLen;
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

/**
 * `stripCommentMarkers` doesn't know about Rust's `/*!` inner doc form, only `/**`. `/*!` and `/**` are the
 * same length and differ only in a character `stripCommentMarkers` never includes in its extracted `text`,
 * so substituting `*` for `!` before delegating is safe and avoids duplicating its gutter-stripping logic.
 */
function stripRustBlockComment(rawText: string): { text: string; map: SourceMap } {
  const normalized = rawText.startsWith('/*!') ? '/**' + rawText.slice(3) : rawText;
  return stripCommentMarkers(normalized);
}

/**
 * Strips a fixed-length opening/closing delimiter pair (quotes, or a raw string's opening/closing tokens)
 * from `rawText`. `hasClose` must come from the scan itself (whether it actually found a closing delimiter,
 * vs. running off the end of the file) - it can't be inferred from `rawText`'s length alone, since a
 * well-formed literal can end exactly at EOF.
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

function isIdentChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_]/.test(ch);
}

/**
 * Scans Rust source for comments and string literals, tagging everything else - including unrecognized char
 * literals and lifetimes - as `code`.
 *
 * A `'` is just ordinary code except when it opens a double-quote char literal (`'"'` or `'\"'`), which
 * `scanTagged` special-cases so the embedded `"` isn't misread as starting a real string.
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

      if (c === 'r' || c === 'b' || c === 'c') {
        const rawString = this.tryScanRawString();
        if (rawString) {
          yield rawString;
          continue;
        }
      }

      // '"' or '\"' - a char literal whose content is a double quote, unescaped or (redundantly, but
      // legally) escaped. Left unrecognized, that embedded '"' would be misread below as the start of a
      // real string. See CONTRIBUTING.md for why this is the one char-literal shape that needs a check.
      if (c === "'" && (n === '"' || (n === '\\' && content[this.i + 2] === '"'))) {
        this.i += n === '"' ? 2 : 3;
        if (content[this.i] === "'") {
          this.i++;
        }
        continue;
      }

      if (c === '"') {
        yield this.scanQuotedString(this.i);
        continue;
      }
      if (c === 'b' && n === '"' && !isIdentChar(content[this.i - 1])) {
        yield this.scanQuotedString(this.i);
        continue;
      }
      if (c === 'c' && n === '"' && !isIdentChar(content[this.i - 1])) {
        yield this.scanQuotedString(this.i);
        continue;
      }

      this.i++;
    }
  }

  /** A `//` line comment, or a doc line comment - `///` (but not a `////`-or-more separator line) or `//!`. */
  private scanLineComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    const isTripleSlash = content[start + 2] === '/' && content[start + 3] !== '/';
    const isBangSlash = content[start + 2] === '!';
    const isDoc = isTripleSlash || isBangSlash;
    const markerLen = isDoc ? 3 : 2;
    const newlineIndex = content.indexOf('\n', start);
    const end = newlineIndex === -1 ? content.length : newlineIndex;
    const rawText = content.slice(start, end);
    const { text, map } = stripLineMarker(rawText, markerLen);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: isDoc ? TAGS.COMMENT_LINE_DOC : TAGS.COMMENT_LINE };
  }

  /**
   * A `/* ... *\/` block comment. Unlike every C-family language, Rust block comments nest
   * (`/* /* nested *\/ still open *\/` is ONE comment) - `depth` tracks un-closed `/*` openers, starting at
   * 1 for this one, only closing once it returns to 0. See CONTRIBUTING.md.
   */
  private scanBlockComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    let i = start + 2;
    let depth = 1;
    while (i < content.length && depth > 0) {
      if (content[i] === '/' && content[i + 1] === '*') {
        depth++;
        i += 2;
        continue;
      }
      if (content[i] === '*' && content[i + 1] === '/') {
        depth--;
        i += 2;
        continue;
      }
      i++;
    }
    const end = i;
    const rawText = content.slice(start, end);
    const isOuterDoc = rawText.startsWith('/**') && rawText.length >= 5;
    const isInnerDoc = rawText.startsWith('/*!');
    const isDoc = isOuterDoc || isInnerDoc;
    const { text, map } = stripRustBlockComment(rawText);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: isDoc ? TAGS.COMMENT_BLOCK_DOC : TAGS.COMMENT_BLOCK };
  }

  /**
   * A plain `"..."`, `b"..."` byte, or `c"..."` C string (`CStr` literal, stable since Rust 1.77) - same
   * escape rules, differing only by tag. `literalStart` is the segment's start: the `"` itself, or the
   * `b`/`c` prefix before it.
   */
  private scanQuotedString(literalStart: number): ParsedText {
    const { content } = this;
    const prefix = content[literalStart];
    const isByte = prefix === 'b';
    const isC = prefix === 'c';
    const quoteStart = isByte || isC ? literalStart + 1 : literalStart;
    let i = quoteStart + 1;
    let closed = false;
    while (i < content.length) {
      if (content[i] === '"') {
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
    const rawText = content.slice(literalStart, end);
    const openLen = quoteStart - literalStart + 1;
    const { text, map } = stripDelimited(rawText, openLen, 1, closed);
    this.i = end;
    const tags = isByte ? TAGS.STRING_BYTE : isC ? TAGS.STRING_C : TAGS.STRING;
    return { text, rawText, map, range: [literalStart, end], tags };
  }

  /**
   * A Rust raw string: optional `b`/`c` prefix (never both), `r`, zero-or-more `#`, then `"..."`, closed by
   * a `"` plus exactly as many `#` as opened it - no escape processing inside. See CONTRIBUTING.md for how
   * this adapts `@cspell/parser-c-cpp-strings-comments`'s raw-string scan to a `#`-count delimiter.
   *
   * Requires a non-identifier character (or start of file) right before the prefix, so this can't misfire
   * mid-identifier (e.g. `author"data"`). Returns `undefined`, consuming nothing, when the prefix doesn't
   * actually resolve to a raw string, so the caller falls back to treating it as an ordinary character.
   */
  private tryScanRawString(): ParsedText | undefined {
    const { content } = this;
    const start = this.i;
    if (isIdentChar(content[start - 1])) return undefined;

    let j = start;
    let isByte = false;
    let isC = false;
    if (content[j] === 'b') {
      isByte = true;
      j++;
    } else if (content[j] === 'c') {
      isC = true;
      j++;
    }
    if (content[j] !== 'r') return undefined;
    j++;

    let hashCount = 0;
    while (content[j] === '#') {
      hashCount++;
      j++;
    }
    if (content[j] !== '"') return undefined;

    const openLen = j - start + 1;
    const bodyStart = start + openLen;
    const closer = '"' + '#'.repeat(hashCount);
    const closeIndex = content.indexOf(closer, bodyStart);
    const closed = closeIndex !== -1;
    const end = closed ? closeIndex + closer.length : content.length;
    const rawText = content.slice(start, end);
    const { text, map } = stripDelimited(rawText, openLen, closer.length, closed);
    this.i = end;
    const tags = isByte ? TAGS.STRING_BYTE_RAW : isC ? TAGS.STRING_C_RAW : TAGS.STRING_RAW;
    return { text, rawText, map, range: [start, end], tags };
  }
}
