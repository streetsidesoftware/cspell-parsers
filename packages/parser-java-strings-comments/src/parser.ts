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
const STRING_TEXT_BLOCK_TAG: ParsedTags = { ...STRING_TAG, 'string.textBlock': true };

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
 * Scans Java source for comments and character/string/text-block literals, yielding one `ParsedText` per
 * segment and silently skipping everything else (identifiers, keywords, punctuation, numbers) - the same
 * "only emit what should be spell checked" approach as `@cspell/parser-example`.
 *
 * Unlike a JS/TS-family scanner, there's no regex-literal ambiguity, no string interpolation, and no
 * module-specifier tagging to worry about here, and a Java text block never fragments around holes the way
 * a template literal does - so each scan method below just returns a single `ParsedText` directly, with no
 * need for an `emitFragment`-style generator.
 *
 * Emits lazily via generators rather than collecting into an array - nothing here holds onto a tree or
 * other resource a consumer could leak by not fully draining the result, so there's no reason to force
 * eager collection.
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
      // A `"` starts a text block only when followed by two more `"` characters (a fixed 3-quote opening
      // delimiter) - otherwise it falls through to an ordinary `"..."` string, same dispatch order the
      // combined @cspell/parser-strings-comments package used for its 'java' dialect.
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
    return { text, rawText, map, range: [start, end], tags: COMMENT_LINE_TAG };
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
    return { text, rawText, map, range: [start, end], tags: isDoc ? COMMENT_BLOCK_DOC_TAG : COMMENT_BLOCK_TAG };
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
    const tag = quote === "'" ? STRING_SINGLE_TAG : STRING_DOUBLE_TAG;
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
    return { text, rawText, map, range: [start, end], tags: STRING_TEXT_BLOCK_TAG };
  }
}

/**
 * Extracts comments and character/string/text-block literals from Java source. See the `Scanner` class for
 * the actual scanning logic.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const parser: Parser = {
  name: 'java-strings-comments',
  parse,
};

export const supportedFileTypes: string[] = ['java'];

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
 * Create a parser for Java files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-java-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'javadoc-only',
 *   tags: { '*': false, 'comment.block.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'java', parser: 'javadoc-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
