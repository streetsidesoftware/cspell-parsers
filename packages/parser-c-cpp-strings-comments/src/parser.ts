import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import { customizeParser, stripCommentMarkers } from '@internal/utils';
import type { TagFilterOptions } from '@internal/utils';

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_LINE_DOC_TAG: ParsedTags = { ...COMMENT_LINE_TAG, 'comment.line.doc': true };
const COMMENT_BLOCK_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.block': true };
const COMMENT_BLOCK_DOC_TAG: ParsedTags = { ...COMMENT_BLOCK_TAG, 'comment.block.doc': true };

const STRING_TAG: ParsedTags = { string: true };
const STRING_SINGLE_TAG: ParsedTags = { ...STRING_TAG, 'string.singleQuote': true };
const STRING_DOUBLE_TAG: ParsedTags = { ...STRING_TAG, 'string.doubleQuote': true };
const STRING_RAW_TAG: ParsedTags = { ...STRING_TAG, 'string.raw': true };

/**
 * Strips a line comment's marker (`//`, or a Doxygen doc marker - `///` or `//!`) - and one following space,
 * if present - from `rawText`. Unlike `@internal/utils`'s `stripCommentMarkers`, this takes the marker's
 * length explicitly, since this scanner has two possible line-comment marker lengths, not just one.
 */
function stripLineMarker(rawText: string, markerLen: number): { text: string; map: SourceMap } {
  let skip = markerLen;
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

/**
 * Strips a fixed-length opening/closing delimiter pair (quotes, or a raw string's `R"delim(`/`)delim"`) from
 * `rawText`. `hasClose` must come from the scan itself (whether it actually found a closing delimiter, vs.
 * running off the end of the file) - it can't be inferred from `rawText`'s length alone, since a well-formed
 * literal can end exactly at EOF.
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
 * Scans C/C++ source for comments and string/char literals, yielding one `ParsedText` per segment and
 * silently skipping everything else (identifiers, keywords, punctuation, numbers) - the same "only emit what
 * should be spell checked" approach as `@cspell/parser-example`, extended to also emit string contents.
 *
 * Emits lazily via a generator rather than collecting into an array - nothing here holds onto a tree or other
 * resource a consumer could leak by not fully draining the result, so there's no reason to force eager
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
      const rawString = this.tryScanCppRawString();
      if (rawString) {
        yield rawString;
        continue;
      }
      if (c === '"') {
        yield this.scanQuotedString('"');
        continue;
      }
      if (c === "'") {
        yield this.scanQuotedString("'");
        continue;
      }

      this.i++;
    }
  }

  /**
   * A `//` line comment, or a Doxygen doc-comment line - `///` (but not a `////`-or-more separator line) or
   * `//!`.
   */
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

  private scanBlockComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    const closeIndex = content.indexOf('*/', start + 2);
    const end = closeIndex === -1 ? content.length : closeIndex + 2;
    const rawText = content.slice(start, end);
    const isDoc = rawText.startsWith('/**') && rawText.length >= 5;
    const { text, map } = stripCommentMarkers(rawText);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: isDoc ? COMMENT_BLOCK_DOC_TAG : COMMENT_BLOCK_TAG };
  }

  /** A plain `'...'` (char literal) or `"..."` (string literal), no interpolation. */
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
    const tag = quote === "'" ? STRING_SINGLE_TAG : STRING_DOUBLE_TAG;
    const { text, map } = stripDelimited(rawText, 1, 1, closed);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: tag };
  }

  /**
   * A C++11 raw string: optional `u8`/`u`/`U`/`L` prefix, then `R"delim(...)delim"` (`delim` up to 16 chars).
   * Requires a non-identifier character before the prefix so this can't misfire mid-identifier (e.g. one
   * ending in `R`). Returns `undefined` without consuming input on a non-match. Safe to always attempt on
   * `.c` files too - real C never contains this syntax.
   */
  private tryScanCppRawString(): ParsedText | undefined {
    const { content } = this;
    const prev = content[this.i - 1];
    if (isIdentChar(prev)) return undefined;
    const match = /^(?:u8|u|U|L)?R"/.exec(content.slice(this.i, this.i + 4));
    if (!match) return undefined;

    const start = this.i;
    const prefixLen = match[0].length;
    const delimStart = start + prefixLen;
    let j = delimStart;
    while (j < content.length && content[j] !== '(' && j - delimStart < 17) j++;
    if (content[j] !== '(') return undefined;

    const delim = content.slice(delimStart, j);
    const closer = ')' + delim + '"';
    const closeIndex = content.indexOf(closer, j + 1);
    const closed = closeIndex !== -1;
    const end = closed ? closeIndex + closer.length : content.length;
    const rawText = content.slice(start, end);
    const openLen = prefixLen + delim.length + 1;
    const { text, map } = stripDelimited(rawText, openLen, closer.length, closed);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: STRING_RAW_TAG };
  }
}

/**
 * Extracts comments and string/char/raw-string literals from C/C++ source, so cspell only ever spell checks
 * that content - never identifiers, keywords, or punctuation. Most consumers won't call this directly; use
 * the `parser`/`plugin` exports, or the `recommended`/`index` settings modules, to wire it into cspell.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const parser: Parser = {
  name: 'c-cpp-strings-comments',
  parse,
};

export const supportedFileTypes: string[] = ['c', 'cpp'];

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /** Overrides the registered parser name (default: `c-cpp-strings-comments`). */
  name?: string;
  /** Which tagged segments to keep; omitting keeps everything. */
  tags?: TagFilterOptions;
}

/**
 * Returns a C/C++ `Parser` that only emits segments matching the given tag filter, optionally under a new
 * name so it can be registered and selected independently of the default `parser` export. See the "Tags"
 * table in `README.md` for the tag names to filter on, and the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting for
 * how the name is used to select a parser.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-c-cpp-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'cpp', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
