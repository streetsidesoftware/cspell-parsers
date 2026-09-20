import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import type { TagFilterOptions } from '@internal/utils';
import { customizeParser, stripCommentMarkers } from '@internal/utils';

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_LINE_DOC_TAG: ParsedTags = { ...COMMENT_LINE_TAG, 'comment.line.doc': true };
const COMMENT_BLOCK_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.block': true };
const COMMENT_BLOCK_DOC_TAG: ParsedTags = { ...COMMENT_BLOCK_TAG, 'comment.block.doc': true };

const STRING_TAG: ParsedTags = { string: true };
const STRING_SINGLE_TAG: ParsedTags = { ...STRING_TAG, 'string.singleQuote': true };
const STRING_DOUBLE_TAG: ParsedTags = { ...STRING_TAG, 'string.doubleQuote': true };
const STRING_VERBATIM_TAG: ParsedTags = { ...STRING_TAG, 'string.verbatim': true };
const STRING_INTERPOLATED_TAG: ParsedTags = { ...STRING_TAG, 'string.interpolated': true };
const STRING_VERBATIM_INTERPOLATED_TAG: ParsedTags = {
  ...STRING_TAG,
  'string.verbatim': true,
  'string.interpolated': true,
};
const STRING_RAW_TAG: ParsedTags = { ...STRING_TAG, 'string.raw': true };
const STRING_RAW_INTERPOLATED_TAG: ParsedTags = { ...STRING_TAG, 'string.raw': true, 'string.interpolated': true };

/**
 * Strips a line comment's marker (`//` or C#'s XML-doc `///`) - and one following space, if present - from
 * `rawText`. Unlike `@internal/utils`'s `stripCommentMarkers`, this takes the marker's length explicitly,
 * since C# has two possible line-comment marker lengths, not just one.
 */
function stripLineMarker(rawText: string, markerLen: number): { text: string; map: SourceMap } {
  let skip = markerLen;
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

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
 * Scans C# source for comments and string/character literals, yielding one `ParsedText` per segment and
 * silently skipping everything else (identifiers, keywords, punctuation, numbers) - the same "only emit
 * what should be spell checked" approach as `@cspell/parser-example`, extended to also emit string contents
 * with per-form tags for C#'s several string literal kinds (plain, verbatim, interpolated, raw).
 *
 * Emits lazily via generators rather than collecting into an array - nothing here holds onto a tree or other
 * resource a consumer could leak by not fully draining the result, so there's no reason to force eager
 * collection.
 */
class Scanner {
  private i = 0;

  constructor(private readonly content: string) {}

  *run(): Generator<ParsedText> {
    yield* this.scanCode(this.content.length, false);
  }

  /**
   * Scans code from `this.i` up to `end`. `stopAtUnmatchedBrace: true` makes this return as soon as it sees
   * a `}` at brace-depth 0, having consumed it - used to find the end of an interpolated string's `{...}`
   * hole without knowing its end index up front.
   */
  private *scanCode(end: number, stopAtUnmatchedBrace: boolean): Generator<ParsedText> {
    const { content } = this;
    let braceDepth = 0;

    while (this.i < end) {
      const c = content[this.i];

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

      if (c === '/' && content[this.i + 1] === '/') {
        yield this.scanLineComment();
        continue;
      }
      if (c === '/' && content[this.i + 1] === '*') {
        yield this.scanBlockComment();
        continue;
      }
      if (c === '@' || c === '$') {
        const consumed = yield* this.tryScanCSharpString();
        if (consumed) continue;
      }
      if (c === '"' && content[this.i + 1] === '"' && content[this.i + 2] === '"') {
        const start = this.i;
        let q = this.i;
        while (content[q] === '"') q++;
        yield this.scanCSharpRawString(start, q - start, false);
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

  /** A `//` line comment, or C#'s `///` XML-doc line comment (but not a `////`-or-more separator line). */
  private scanLineComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    const isTripleSlash = content[start + 2] === '/' && content[start + 3] !== '/';
    const markerLen = isTripleSlash ? 3 : 2;
    const newlineIndex = content.indexOf('\n', start);
    const end = newlineIndex === -1 ? content.length : newlineIndex;
    const rawText = content.slice(start, end);
    const { text, map } = stripLineMarker(rawText, markerLen);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: isTripleSlash ? COMMENT_LINE_DOC_TAG : COMMENT_LINE_TAG };
  }

  /** A `/* *\/` block comment; `/** *\/` is tagged as a doc comment even though C# doesn't use that form. */
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

  /** A plain `'...'` char literal or `"..."` string literal - ordinary backslash escapes, no interpolation. */
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
   * Dispatches a C# string starting with `@` or `$` (verbatim, interpolated, or both) - including the
   * triple-or-more-quote "raw string literal" form, which either prefix can also introduce. Returns `false`
   * (consuming nothing) for a bare `@identifier` (C#'s syntax for using a keyword as an identifier), which
   * isn't a string at all.
   */
  private *tryScanCSharpString(): Generator<ParsedText, boolean> {
    const { content } = this;
    const start = this.i;
    let j = start;
    let verbatim = false;
    let interpolated = false;
    if (content[j] === '@' && content[j + 1] === '$') {
      verbatim = true;
      interpolated = true;
      j += 2;
    } else if (content[j] === '$' && content[j + 1] === '@') {
      verbatim = true;
      interpolated = true;
      j += 2;
    } else if (content[j] === '@') {
      verbatim = true;
      j += 1;
    } else if (content[j] === '$') {
      interpolated = true;
      j += 1;
    }
    if (content[j] !== '"') return false;

    let quoteEnd = j;
    while (content[quoteEnd] === '"') quoteEnd++;
    const quoteRun = quoteEnd - j;
    this.i = j;

    if (quoteRun >= 3) {
      yield this.scanCSharpRawString(start, quoteRun, interpolated);
    } else if (interpolated) {
      yield* this.scanCSharpInterpolatedString(start, verbatim);
    } else {
      yield this.scanCSharpVerbatimString(start);
    }
    return true;
  }

  /** `@"..."` - doubled `""` is an escaped quote; no backslash escapes. */
  private scanCSharpVerbatimString(start: number): ParsedText {
    const { content } = this;
    const openLen = this.i - start + 1;
    let i = this.i + 1;
    let closed = false;
    while (i < content.length) {
      if (content[i] === '"') {
        if (content[i + 1] === '"') {
          i += 2;
          continue;
        }
        i++;
        closed = true;
        break;
      }
      i++;
    }
    const end = i;
    const rawText = content.slice(start, end);
    const { text, map } = stripDelimited(rawText, openLen, 1, closed);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: STRING_VERBATIM_TAG };
  }

  /**
   * `$"..."` / `$@"..."` / `@$"..."` - split into fragments around `{...}` holes, the same way a JS/TS
   * template literal's `scanTemplateLiteral` splits on `${...}`. `{{`/`}}` are literal braces, not holes. A
   * verbatim (`@`-combined) interpolated string still doubles `""` for a literal quote and doesn't use
   * backslash escapes; a plain `$"..."` uses ordinary backslash escapes instead.
   */
  private *scanCSharpInterpolatedString(start: number, verbatim: boolean): Generator<ParsedText> {
    const { content } = this;
    const openLen = this.i - start + 1;
    const tag = verbatim ? STRING_VERBATIM_INTERPOLATED_TAG : STRING_INTERPOLATED_TAG;
    let i = start + openLen;
    let fragStart = i;
    for (;;) {
      if (i >= content.length) {
        yield* this.emitFragment(fragStart, i, tag);
        this.i = i;
        return;
      }
      const c = content[i];
      if (!verbatim && c === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      if (c === '"') {
        if (verbatim && content[i + 1] === '"') {
          i += 2;
          continue;
        }
        yield* this.emitFragment(fragStart, i, tag);
        i++;
        this.i = i;
        return;
      }
      if (c === '{') {
        if (content[i + 1] === '{') {
          i += 2;
          continue;
        }
        yield* this.emitFragment(fragStart, i, tag);
        i++;
        this.i = i;
        yield* this.scanCode(content.length, true);
        i = this.i;
        fragStart = i;
        continue;
      }
      if (c === '}' && content[i + 1] === '}') {
        i += 2;
        continue;
      }
      i++;
    }
  }

  /**
   * C# 11 "raw string literal": 3-or-more `"` characters, closed by a run of at least as many. Simplified
   * relative to the real spec (no stripping of common leading indentation, and - unlike
   * `scanCSharpInterpolatedString` - an interpolated raw string's `{...}` holes aren't split out into their
   * own code scan, just kept as part of the emitted text) since both only affect formatting/
   * identifier-checking of an already-rare form, not whether the literal's own boundaries are found correctly.
   */
  private scanCSharpRawString(start: number, quoteRun: number, interpolated: boolean): ParsedText {
    const { content } = this;
    const prefixLen = this.i - start;
    const openLen = prefixLen + quoteRun;
    let i = start + openLen;
    let closeAt = -1;
    while (i < content.length) {
      if (content[i] === '"') {
        const runStart = i;
        while (content[i] === '"') i++;
        if (i - runStart >= quoteRun) {
          closeAt = runStart;
          break;
        }
        continue;
      }
      i++;
    }
    const closed = closeAt !== -1;
    const end = closed ? closeAt + quoteRun : content.length;
    const rawText = content.slice(start, end);
    const { text, map } = stripDelimited(rawText, openLen, quoteRun, closed);
    this.i = end;
    return {
      text,
      rawText,
      map,
      range: [start, end],
      tags: interpolated ? STRING_RAW_INTERPOLATED_TAG : STRING_RAW_TAG,
    };
  }

  /** A non-empty `[start, end)` slice of `content`, emitted as-is (no transform, so no `map` needed). */
  private *emitFragment(start: number, end: number, tags: ParsedTags): Generator<ParsedText> {
    if (end <= start) return;
    const text = this.content.slice(start, end);
    yield { text, rawText: text, range: [start, end], tags };
  }
}

/**
 * cspell `Parser.parse` implementation for C#: returns the file's comments and string/character literals for
 * spell checking, skipping everything else (identifiers, keywords, punctuation, numbers).
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const parser: Parser = {
  name: 'csharp-strings-comments',
  parse,
};

export const supportedFileTypes: string[] = ['csharp'];

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
 * Create a parser for C# files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-csharp-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.line.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'csharp', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
