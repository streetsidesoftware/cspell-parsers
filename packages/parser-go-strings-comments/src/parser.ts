import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import type { TagFilterOptions } from '@internal/utils';
import { customizeParser, stripCommentMarkers } from '@internal/utils';

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_BLOCK_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.block': true };
const COMMENT_BLOCK_DOC_TAG: ParsedTags = { ...COMMENT_BLOCK_TAG, 'comment.block.doc': true };

const STRING_TAG: ParsedTags = { string: true };
const STRING_SINGLE_TAG: ParsedTags = { ...STRING_TAG, 'string.singleQuote': true };
const STRING_DOUBLE_TAG: ParsedTags = { ...STRING_TAG, 'string.doubleQuote': true };
const STRING_RAW_TAG: ParsedTags = { ...STRING_TAG, 'string.raw': true };

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
 * Scans Go source for comments and string/rune/raw-string literals, yielding one `ParsedText` per segment
 * and skipping everything else (identifiers, keywords, punctuation, numbers).
 *
 * Go has no template-literal-style interpolation and no regex-literal-vs-division ambiguity to resolve, so
 * unlike the JS/TS-family scanner this is split from, no construct here ever splits into multiple fragments
 * or needs lookahead/lookbehind - each scan method below emits exactly one `ParsedText`.
 *
 * Emits lazily via a generator rather than an array - nothing here needs eager draining to release a resource.
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
    return { text, rawText, map, range: [start, end], tags: COMMENT_LINE_TAG };
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
    const tag = quote === "'" ? STRING_SINGLE_TAG : STRING_DOUBLE_TAG;
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
    return { text, rawText, map, range: [start, end], tags: STRING_RAW_TAG };
  }
}

/** Extracts comments and string/rune/raw-string literals from Go source for cspell to spell check. */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const parser: Parser = {
  name: 'go-strings-comments',
  parse,
};

export const supportedFileTypes: string[] = ['go'];

/** Options for {@link createParser}. */
export interface CustomizeParserOptions {
  name?: string;
  /** Omit to keep every tagged segment. */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for Go files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-go-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'strings-only',
 *   tags: { '*': false, string: true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'go', parser: 'strings-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
