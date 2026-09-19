import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import { customizeParser, stripCommentMarkers } from '@internal/utils';
import type { TagFilterOptions } from '@internal/utils';

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_LINE_DOC_TAG: ParsedTags = { ...COMMENT_LINE_TAG, 'comment.line.doc': true };
const COMMENT_BLOCK_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.block': true };
const COMMENT_BLOCK_DOC_TAG: ParsedTags = { ...COMMENT_BLOCK_TAG, 'comment.block.doc': true };

/**
 * Rust has one string quote character, so these tags encode the string's *kind* (plain/byte/raw/C) rather
 * than quote style. Hierarchical, per this repo's dot-path convention: `string.byte.raw` also carries
 * `string.byte` and `string`, so filtering on `string.byte` matches both byte forms.
 */
const STRING_TAG: ParsedTags = { string: true };
const STRING_BYTE_TAG: ParsedTags = { ...STRING_TAG, 'string.byte': true };
const STRING_RAW_TAG: ParsedTags = { ...STRING_TAG, 'string.raw': true };
const STRING_BYTE_RAW_TAG: ParsedTags = { ...STRING_BYTE_TAG, 'string.byte.raw': true };
const STRING_C_TAG: ParsedTags = { ...STRING_TAG, 'string.c': true };
const STRING_C_RAW_TAG: ParsedTags = { ...STRING_C_TAG, 'string.c.raw': true };

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
 * Scans Rust source for comments and string literals, yielding one `ParsedText` per segment and silently
 * skipping everything else - identifiers, keywords, punctuation, numbers, lifetimes, and char literals -
 * the same "only emit what should be spell checked" approach as `@cspell/parser-example`.
 *
 * Char/byte-char literals and lifetimes/labels get no general recognition; a bare `'` is just ordinary,
 * unrecognized code. The one exception is a `'` that opens a double-quote char literal (`'"'` or `'\"'`),
 * which `run()` special-cases - see CONTRIBUTING.md for why.
 *
 * No construct here splits into multiple fragments (Rust has no string interpolation), and block comments
 * nest (`scanBlockComment` tracks depth) - see CONTRIBUTING.md.
 */
class Scanner {
  private i = 0;

  constructor(private readonly content: string) {}

  *run(): Generator<ParsedText> {
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
    return { text, rawText, map, range: [start, end], tags: isDoc ? COMMENT_LINE_DOC_TAG : COMMENT_LINE_TAG };
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
    return { text, rawText, map, range: [start, end], tags: isDoc ? COMMENT_BLOCK_DOC_TAG : COMMENT_BLOCK_TAG };
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
    const tags = isByte ? STRING_BYTE_TAG : isC ? STRING_C_TAG : STRING_TAG;
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
    const tags = isByte ? STRING_BYTE_RAW_TAG : isC ? STRING_C_RAW_TAG : STRING_RAW_TAG;
    return { text, rawText, map, range: [start, end], tags };
  }
}

/**
 * Extracts comments and string literals from Rust source (char literals are recognized but never spell
 * checked). See the `Scanner` class for the actual scanning logic.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const parser: Parser = {
  name: 'rust-strings-comments',
  parse,
};

export const supportedFileTypes: string[] = ['rust'];

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  name?: string;
  /** Omit to keep everything. */
  tags?: TagFilterOptions;
}

/**
 * Create a renamed and/or tag-filtered copy of {@link parser}.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-rust-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'rust', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
