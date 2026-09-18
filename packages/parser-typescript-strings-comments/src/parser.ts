import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import { customizeParser, stripCommentMarkers } from '@internal/utils';
import type { TagFilterOptions } from '@internal/utils';

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_BLOCK_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.block': true };
const COMMENT_BLOCK_DOC_TAG: ParsedTags = { ...COMMENT_BLOCK_TAG, 'comment.block.doc': true };

const STRING_TAG: ParsedTags = { string: true };
const STRING_SINGLE_TAG: ParsedTags = { ...STRING_TAG, 'string.singleQuote': true };
const STRING_DOUBLE_TAG: ParsedTags = { ...STRING_TAG, 'string.doubleQuote': true };
const STRING_TEMPLATE_TAG: ParsedTags = { ...STRING_TAG, 'string.templateLiteral': true };

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
 * `false` for a character that can never legitimately precede a real string literal's opening quote in valid
 * JS/TS syntax, directly and unambiguously (no space, no operator): an identifier character (`foo"bar"` isn't
 * valid) or another quote (`"a"'b'` isn't either - two adjacent primary expressions always need an operator
 * between them). Seeing one of these right before a `'`/`"` is a strong signal the quote is actually inside a
 * regex character class this scanner doesn't otherwise recognize (e.g. *both* quotes in `` /[\w"']/ ``: the
 * `"` follows `\w`'s `w`, and the `'` follows that same `"`), not the start of a real string.
 *
 * This can't catch every such case - a class that opens with a quote right after `[` (`` /['"]/ ``) looks
 * exactly like a real string starting right after an array literal's bracket (`["real string"]`), which *is*
 * valid, so that one's ambiguous either way and still gets misread. See `README.md`'s "Known limitations".
 *
 * `scanCode` only calls this once it's seen a bare `/` since the last reset point (`sawSlash`), rather than
 * on every quote in the file - regex literals are rare, so this skips the regex test entirely for the
 * overwhelming majority of quotes, which are nowhere near a `/`.
 */
function canPrecedeString(prev: string | undefined): boolean {
  return prev === undefined || !/[A-Za-z0-9_$'"]/.test(prev);
}

/**
 * Scans JavaScript/JSX/TypeScript/TSX source for comments and string/template literals, emitting one
 * `ParsedText` per segment and silently skipping everything else (identifiers, keywords, punctuation,
 * numbers, JSX markup) - the same "only emit what should be spell checked" approach as
 * `@cspell/parser-example`, extended to also emit string contents.
 */
class Scanner {
  private i = 0;
  readonly out: ParsedText[] = [];

  constructor(private readonly content: string) {}

  run(): void {
    this.scanCode(this.content.length, false);
  }

  /**
   * Scans code from `this.i` up to `end`. `stopAtUnmatchedBrace: true` makes this return as soon as it sees
   * a `}` at brace-depth 0, having consumed it - used to find the end of a `${...}` interpolation hole
   * without knowing its end index up front.
   */
  private scanCode(end: number, stopAtUnmatchedBrace: boolean): void {
    const { content } = this;
    let braceDepth = 0;
    // Sticky, not toggled: sawSlash just means "a bare `/` appeared somewhere since the last reset point
    // (start of scan, a newline, or a recognized //, /*, or ` token)". It's cleared as soon as this scan
    // sees any of those. See canPrecedeString's doc comment for why this gates it at all, and its own doc
    // comment just below for why it's sticky rather than toggled per `/`.
    let sawSlash = false;

    while (this.i < end) {
      const c = content[this.i];
      const n = content[this.i + 1];

      if (c === '{') {
        braceDepth++;
        this.i++;
        continue;
      }
      if (c === '}') {
        if (stopAtUnmatchedBrace && braceDepth === 0) {
          this.i++;
          return;
        }
        braceDepth--;
        this.i++;
        continue;
      }

      if (c === '/' && n === '/') {
        this.scanLineComment();
        sawSlash = false;
        continue;
      }
      if (c === '/' && n === '*') {
        this.scanBlockComment();
        sawSlash = false;
        continue;
      }
      if (c === '`') {
        this.scanTemplateLiteral();
        sawSlash = false;
        continue;
      }

      if ((c === '"' || c === "'") && (!sawSlash || canPrecedeString(content[this.i - 1]))) {
        this.scanQuotedString(c);
        continue;
      }

      if (c === '/') {
        sawSlash = true;
      } else if (c === '\n') {
        sawSlash = false;
      }

      this.i++;
    }
  }

  private scanLineComment(): void {
    const { content } = this;
    const start = this.i;
    const newlineIndex = content.indexOf('\n', start);
    const end = newlineIndex === -1 ? content.length : newlineIndex;
    const rawText = content.slice(start, end);
    const { text, map } = stripCommentMarkers(rawText);
    this.out.push({ text, rawText, map, range: [start, end], tags: COMMENT_LINE_TAG });
    this.i = end;
  }

  private scanBlockComment(): void {
    const { content } = this;
    const start = this.i;
    const closeIndex = content.indexOf('*/', start + 2);
    const end = closeIndex === -1 ? content.length : closeIndex + 2;
    const rawText = content.slice(start, end);
    const isDoc = rawText.startsWith('/**') && rawText.length >= 5;
    const { text, map } = stripCommentMarkers(rawText);
    this.out.push({ text, rawText, map, range: [start, end], tags: isDoc ? COMMENT_BLOCK_DOC_TAG : COMMENT_BLOCK_TAG });
    this.i = end;
  }

  /** A plain `'...'`/`"..."` string. */
  private scanQuotedString(quote: string): void {
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
    this.out.push({ text, rawText, map, range: [start, end], tags: tag });
    this.i = end;
  }

  /** A template literal, split into `string.templateLiteral` fragments around `${...}` holes. */
  private scanTemplateLiteral(): void {
    const { content } = this;
    let i = this.i + 1;
    let fragStart = i;
    for (;;) {
      if (i >= content.length) {
        this.emitFragment(fragStart, i, STRING_TEMPLATE_TAG);
        this.i = i;
        return;
      }
      const c = content[i];
      if (c === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      if (c === '`') {
        this.emitFragment(fragStart, i, STRING_TEMPLATE_TAG);
        i++;
        this.i = i;
        return;
      }
      if (c === '$' && content[i + 1] === '{') {
        this.emitFragment(fragStart, i, STRING_TEMPLATE_TAG);
        i += 2;
        this.i = i;
        this.scanCode(content.length, true);
        i = this.i;
        fragStart = i;
        continue;
      }
      i++;
    }
  }

  /** A non-empty `[start, end)` slice of `content`, emitted as-is (no transform, so no `map` needed). */
  private emitFragment(start: number, end: number, tags: ParsedTags): void {
    if (end <= start) return;
    const text = this.content.slice(start, end);
    this.out.push({ text, rawText: text, range: [start, end], tags });
  }
}

/**
 * Extracts comments and string/template literals from JavaScript/JSX/TypeScript/TSX source. See the
 * `Scanner` class for the actual scanning logic.
 */
export function parse(content: string, filename: string): ParseResult {
  const scanner = new Scanner(content);
  scanner.run();
  return { content, filename, parsedTexts: scanner.out };
}

export const parser: Parser = {
  name: 'typescript-strings-comments',
  parse,
};

export const supportedFileTypes: string[] = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];

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
 * Create a parser for JavaScript, JSX, TypeScript, and TSX files. You can set the name of the parser and
 * filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-typescript-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'typescript', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
