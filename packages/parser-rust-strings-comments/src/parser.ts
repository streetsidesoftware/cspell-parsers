import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import { customizeParser, stripCommentMarkers } from '@internal/utils';
import type { TagFilterOptions } from '@internal/utils';

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_LINE_DOC_TAG: ParsedTags = { ...COMMENT_LINE_TAG, 'comment.line.doc': true };
const COMMENT_BLOCK_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.block': true };
const COMMENT_BLOCK_DOC_TAG: ParsedTags = { ...COMMENT_BLOCK_TAG, 'comment.block.doc': true };

const STRING_TAG: ParsedTags = { string: true };
const STRING_DOUBLE_TAG: ParsedTags = { ...STRING_TAG, 'string.doubleQuote': true };
const STRING_RAW_TAG: ParsedTags = { ...STRING_TAG, 'string.raw': true };

/**
 * Strips a line comment's marker (`//`, or a doc marker - `///` or `//!`) - and one following space, if
 * present - from `rawText`. Unlike `@internal/utils`'s `stripCommentMarkers`, this takes the marker's length
 * explicitly, since this scanner has two possible line-comment marker lengths, not just one.
 */
function stripLineMarker(rawText: string, markerLen: number): { text: string; map: SourceMap } {
  let skip = markerLen;
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

/**
 * `stripCommentMarkers` only special-cases a `/**` opener (as both a 3-char marker and for its own
 * per-line "gutter" stripping decisions) - it has no notion of Rust's `/*!` inner doc-block form. Since
 * `/*!` and `/**` are the same length and differ only in the one character `stripCommentMarkers` itself
 * inspects for that check (and never includes in the extracted `text`, which always starts at or after the
 * 3-char open marker), substituting a `*` for the `!` before delegating gets `/*!` the same 3-char-marker
 * treatment as `/**` without duplicating `stripCommentMarkers`'s gutter-stripping logic here.
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
 * skipping everything else (identifiers, keywords, punctuation, numbers, lifetimes, char literals) - the
 * same "only emit what should be spell checked" approach as `@cspell/parser-example`, extended to also emit
 * string contents.
 *
 * **Char literals (`'a'`, `'\n'`, ...), byte-char literals (`b'x'`, ...), and lifetimes/labels (`'a`,
 * `'static`, `'_`, ...) are not specially recognized at all** - a bare `'` is simply treated as ordinary,
 * unrecognized code, exactly like any other punctuation this scanner doesn't check. This is a deliberate
 * simplification, not an oversight: char literals have no prose worth spell checking, so there's no need to
 * parse their shape just to decide not to emit them. See `README.md`'s "Known limitations" for the one real
 * consequence of this choice: a char literal containing a `"` (e.g. `'"'`) can cause a real string right
 * after it to be misread.
 *
 * Rust has no template-literal-style interpolation, so - unlike the JS/TS-family scanner in this repo - no
 * construct here ever splits into multiple fragments; each emitting scan method emits exactly one
 * `ParsedText`. It has one wrinkle no other language in this repo has needed yet, covered in detail in
 * `CONTRIBUTING.md`: block comments nest (`/* /* nested *\/ still open *\/` is ONE comment) -
 * `scanBlockComment` tracks a depth counter rather than closing at the first `*\/`.
 *
 * Emits lazily via a generator rather than collecting into an array - nothing here holds onto a tree or
 * other resource a consumer could leak by not fully draining the result, so there's no reason to force eager
 * collection.
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

      if (c === 'r' || c === 'b') {
        const rawString = this.tryScanRawString();
        if (rawString) {
          yield rawString;
          continue;
        }
      }

      if (c === '"') {
        yield this.scanQuotedString(this.i);
        continue;
      }
      if (c === 'b' && n === '"' && !isIdentChar(content[this.i - 1])) {
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
   * A `/* ... *\/` block comment. Unlike every C-family language, Rust block comments nest:
   * `/* /* nested *\/ still open *\/` is ONE comment, not two. `depth` tracks how many un-closed `/*`
   * openers have been seen (starting at 1, for the one this method was called for), incrementing on every
   * further `/*` and decrementing on every `*\/`, only closing the comment once `depth` returns to 0. This
   * applies uniformly to a plain block comment and both doc-comment block forms (`/** ... *\/`,
   * `/*! ... *\/`) - see CONTRIBUTING.md.
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
   * A plain `"..."` string, or a `b"..."` byte string - both use the same ordinary backslash-escape rules
   * and the same tag (no separate "bytes" tag, the same simplification already used for Python's
   * `b`-prefixed strings elsewhere in this repo). `literalStart` is where the emitted segment begins - the
   * `"` itself, or the `b` right before it for a byte string.
   */
  private scanQuotedString(literalStart: number): ParsedText {
    const { content } = this;
    const quoteStart = content[literalStart] === 'b' ? literalStart + 1 : literalStart;
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
    return { text, rawText, map, range: [literalStart, end], tags: STRING_DOUBLE_TAG };
  }

  /**
   * A Rust raw string: optional `b` byte prefix, `r`, zero-or-more `#` characters, then `"..."`, closed by a
   * `"` followed by exactly as many `#` characters as opened it - adapted from
   * `@cspell/parser-c-cpp-strings-comments`'s `tryScanCppRawString`, which matches a closing token built
   * from an arbitrary *text* delimiter; Rust's delimiter is instead a *count* of `#` characters, so the
   * closing token here is built by repeating `#` `hashCount` times rather than copied out of the source. No
   * escape processing at all inside - a backslash is a literal character, not an escape, so unlike
   * `scanQuotedString` this never calls `skipEscape`.
   *
   * Requires a non-identifier character (or start of file) immediately before the `b`/`r` prefix, so this
   * can't misfire partway through an ordinary identifier that happens to end in "r" or "b" (mirrors
   * `tryScanRegExpCallArgs`'s boundary check in `@cspell/parser-typescript-strings-comments`). Returns
   * `undefined` (consuming nothing) if the pattern doesn't actually match a raw string opener, so the caller
   * falls back to treating the prefix letter as an ordinary skipped character.
   */
  private tryScanRawString(): ParsedText | undefined {
    const { content } = this;
    const start = this.i;
    if (isIdentChar(content[start - 1])) return undefined;

    let j = start;
    if (content[j] === 'b') j++;
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
    return { text, rawText, map, range: [start, end], tags: STRING_RAW_TAG };
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
  /**
   * Set the name of the parser.
   */
  name?: string;
  /**
   * Define which tagged segments to keep. Omit to keep everything.
   */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for Rust files. You can set the name of the parser and filter on the tags if desired.
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
