import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import { customizeParser } from '@internal/utils';
import type { TagFilterOptions } from '@internal/utils';

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };

const STRING_TAG: ParsedTags = { string: true };
const STRING_SINGLE_TAG: ParsedTags = { ...STRING_TAG, 'string.singleQuote': true };
const STRING_DOUBLE_TAG: ParsedTags = { ...STRING_TAG, 'string.doubleQuote': true };
const STRING_TRIPLE_TAG: ParsedTags = { ...STRING_TAG, 'string.tripleQuote': true };

const STRING_RAW_FLAG: ParsedTags = { 'string.raw': true };
const STRING_INTERPOLATED_FLAG: ParsedTags = { 'string.interpolated': true };

/**
 * Composes a base quote-style tag with the `string.raw`/`string.interpolated` flags for a given prefix,
 * instead of declaring all twelve quote/raw/interpolated combinations as separate constants - `isRaw`/
 * `isInterpolated` are known once per string literal, not per character, so this costs nothing extra.
 */
function stringTags(base: ParsedTags, isRaw: boolean, isInterpolated: boolean): ParsedTags {
  if (!isRaw && !isInterpolated) return base;
  return {
    ...base,
    ...(isRaw ? STRING_RAW_FLAG : undefined),
    ...(isInterpolated ? STRING_INTERPOLATED_FLAG : undefined),
  };
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
 * Strips a `#` line comment's marker - and one following space, if present - from `rawText`. Python has no
 * block-comment syntax, so unlike `@internal/utils`'s `stripCommentMarkers` (which handles both `//` and
 * `/* *\/`), this only ever needs the one-character line form.
 */
function stripLineComment(rawText: string): { text: string; map: SourceMap } {
  let skip = 1; // '#'
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

/**
 * Advances past a backslash escape (`\x` as one unit) without stepping beyond `content.length` - a trailing
 * backslash with nothing after it (an unterminated literal ending mid-escape) has nothing left to escape, so
 * this just lands on the end of `content` instead of one past it.
 *
 * Used for every string form, including raw (`r`-prefixed) ones - see `CONTRIBUTING.md` for why a raw
 * string's backslash still needs to be treated as "protecting" the next character when looking for the
 * closing quote, even though a raw string doesn't interpret the escape semantically.
 */
function skipEscape(content: string, i: number): number {
  return Math.min(i + 2, content.length);
}

function isIdentChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_]/.test(ch);
}

function isQuoteChar(ch: string | undefined): boolean {
  return ch === "'" || ch === '"';
}

/** First character of every valid string prefix - checked before the (slightly pricier) `detectStringPrefix`. */
const PREFIX_START_CHARS = new Set(['r', 'R', 'u', 'U', 'f', 'F', 'b', 'B']);

/**
 * The only string prefixes Python actually recognizes (case-insensitive) - a bare `r`/`u`/`f`/`b`, or a
 * 2-letter raw+bytes/raw+f-string combination in either order. `u` (a legacy Python-2-compatibility marker)
 * and no prefix at all behave identically today, so it's included here purely so it's recognized as a
 * prefix at all - `detectStringPrefix` never sets `isRaw`/`isF` for it, so it never affects tagging.
 */
const VALID_STRING_PREFIXES = new Set(['r', 'u', 'f', 'b', 'rb', 'br', 'rf', 'fr']);

interface StringPrefixInfo {
  /** Length of the prefix itself (0, 1, or 2) - callers add this to find the opening quote. */
  readonly prefixLen: number;
  readonly isRaw: boolean;
  readonly isF: boolean;
}

/**
 * Detects a valid string prefix starting at `content[i]`, immediately followed by a quote character, with a
 * word boundary before it (`content[i - 1]` isn't an identifier character) - so an ordinary identifier that
 * merely ends in `r`/`f`/`b`/`u` right before an unrelated quote elsewhere in the file is never mistaken
 * for a prefix. Mirrors the boundary-guarded prefix-detection pattern
 * `@cspell/parser-typescript-strings-comments`'s `tryScanRegExpCallArgs` uses for `RegExp(...)`.
 *
 * Tries the 2-letter combination first (greedily) so `rb`/`br`/`rf`/`fr` aren't cut short at their first
 * letter; a 1-letter prefix is only considered once the 2-letter one doesn't match a quote right after it.
 */
function detectStringPrefix(content: string, i: number): StringPrefixInfo | undefined {
  if (isIdentChar(content[i - 1])) return undefined;
  for (const prefixLen of [2, 1]) {
    const candidate = content.slice(i, i + prefixLen);
    if (candidate.length !== prefixLen) continue;
    const lower = candidate.toLowerCase();
    if (VALID_STRING_PREFIXES.has(lower) && isQuoteChar(content[i + prefixLen])) {
      return { prefixLen, isRaw: lower.includes('r'), isF: lower.includes('f') };
    }
  }
  return undefined;
}

/** `true` if `content[i]` starts a closing delimiter of `delimLen` copies of `quote` in a row. */
function isClosingDelimiterAt(content: string, i: number, quote: string, delimLen: number): boolean {
  if (content[i] !== quote) return false;
  if (delimLen === 1) return true;
  return content[i + 1] === quote && content[i + 2] === quote;
}

/**
 * Scans Python source for comments and string literals, yielding one `ParsedText` per segment and silently
 * skipping everything else (identifiers, keywords, punctuation, numbers, operators).
 */
class Scanner {
  private i = 0;

  constructor(private readonly content: string) {}

  *run(): Generator<ParsedText> {
    yield* this.scanCode(this.content.length, false);
  }

  /**
   * Scans code from `this.i` up to `end`. `stopAtUnmatchedBrace: true` makes this return as soon as it sees
   * a `}` at brace-depth 0, having consumed it - used to find the end of an f-string's `{...}` interpolation
   * hole without knowing its end index up front. A nested `{...}` inside the hole (e.g. a format spec's own
   * replacement field, `f"{value:{width}}"`) is handled the same way template-literal interpolation is:
   * balanced brace counting, not real grammar.
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

      if (c === '#') {
        yield this.scanLineComment();
        continue;
      }

      if (isQuoteChar(c)) {
        yield* this.scanString(0, false, false);
        continue;
      }

      if (PREFIX_START_CHARS.has(c)) {
        const prefix = detectStringPrefix(content, this.i);
        if (prefix) {
          yield* this.scanString(prefix.prefixLen, prefix.isRaw, prefix.isF);
          continue;
        }
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
    const { text, map } = stripLineComment(rawText);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: COMMENT_LINE_TAG };
  }

  /** A string literal at `this.i`: the prefix's first character, or the opening quote when there's no prefix. */
  private *scanString(prefixLen: number, isRaw: boolean, isF: boolean): Generator<ParsedText> {
    const { content } = this;
    const start = this.i;
    const quote = content[start + prefixLen];
    const isTriple = content[start + prefixLen + 1] === quote && content[start + prefixLen + 2] === quote;
    const delimLen = isTriple ? 3 : 1;
    const openLen = prefixLen + delimLen;
    const baseTag = isTriple ? STRING_TRIPLE_TAG : quote === "'" ? STRING_SINGLE_TAG : STRING_DOUBLE_TAG;
    const tag = stringTags(baseTag, isRaw, isF);

    this.i = start + openLen;
    if (isF) {
      yield* this.scanInterpolatedStringBody(start, openLen, quote, delimLen, tag);
    } else {
      yield this.scanPlainStringBody(start, openLen, quote, delimLen, tag);
    }
  }

  /**
   * A plain (non-`f`) string's body, scanned to the closing delimiter or EOF (see `skipEscape` for why raw
   * strings still escape-skip). A non-triple string doesn't stop early at a literal newline - real Python
   * would reject one, but this parser keeps scanning to the matching quote or EOF regardless.
   */
  private scanPlainStringBody(
    start: number,
    openLen: number,
    quote: string,
    delimLen: number,
    tag: ParsedTags,
  ): ParsedText {
    const { content } = this;
    let i = start + openLen;
    let closed = false;
    while (i < content.length) {
      if (content[i] === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      if (isClosingDelimiterAt(content, i, quote, delimLen)) {
        i += delimLen;
        closed = true;
        break;
      }
      i++;
    }
    const end = i;
    const rawText = content.slice(start, end);
    const { text, map } = stripDelimited(rawText, openLen, delimLen, closed);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: tag };
  }

  /**
   * An `f`-prefixed string's body, split into fragments around `{...}` interpolation holes. Python f-strings
   * use bare `{`/`}`; a doubled `{{`/`}}` is a literal brace, not a hole.
   */
  private *scanInterpolatedStringBody(
    start: number,
    openLen: number,
    quote: string,
    delimLen: number,
    tag: ParsedTags,
  ): Generator<ParsedText> {
    const { content } = this;
    let i = start + openLen;
    let fragStart = i;
    for (;;) {
      if (i >= content.length) {
        yield* this.emitFragment(fragStart, i, tag);
        this.i = i;
        return;
      }
      const c = content[i];
      if (c === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      if (isClosingDelimiterAt(content, i, quote, delimLen)) {
        yield* this.emitFragment(fragStart, i, tag);
        i += delimLen;
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

  /** A non-empty `[start, end)` slice of `content`, emitted as-is (no transform, so no `map` needed). */
  private *emitFragment(start: number, end: number, tags: ParsedTags): Generator<ParsedText> {
    if (end <= start) return;
    const text = this.content.slice(start, end);
    yield { text, rawText: text, range: [start, end], tags };
  }
}

/**
 * Extracts comments and string literals from Python source into the `ParseResult` cspell uses to spell
 * check just those parts of the file. Most consumers should register the exported {@link parser} (or a
 * {@link createParser} customization) with cspell rather than calling this directly.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const parser: Parser = {
  name: 'python-strings-comments',
  parse,
};

export const supportedFileTypes: string[] = ['python'];

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /** Overrides the parser's registered name. */
  name?: string;
  /** Tagged segments to keep; omit to keep everything. */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for Python files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * ```ts
 * // cspell.config.mts
 * import { createParser } from '@cspell/parser-python-strings-comments/parser';
 *
 * const parser = createParser({ name: 'strings-only', tags: { '*': false, string: true } });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'python', parser: 'strings-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
