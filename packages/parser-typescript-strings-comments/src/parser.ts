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

function isIdentChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_$]/.test(ch);
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
 * Keywords after which a `/` is unambiguously the start of a regex literal, never division - there's no
 * operand for division to act on yet at these points, only an expression's worth of space. Lets
 * `isDivisionContext` see past a keyword that (like any identifier) ends in a word character - e.g. the `n`
 * of `return` - to the expression position that actually follows it.
 */
const REGEX_CONTEXT_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
  'default',
  'extends',
]);

/**
 * `true` if the nearest significant character before `content[slashIndex]` (a `/`) already produced a value
 * - an identifier/number that isn't one of {@link REGEX_CONTEXT_KEYWORDS}, a `)`, a `]`, or a `}` - meaning
 * this `/` is a division/modulo-style operator, not the start of a regex literal. This is the same "what
 * token precedes it" context a real JS parser uses to resolve the identical ambiguity. It isn't exhaustive
 * (a user identifier that shadows a keyword, ASI edge cases, ... aren't covered), but it's deliberately
 * biased toward false negatives over false positives: `}` is genuinely ambiguous (it closes both a block
 * statement, after which a real regex commonly *does* follow, and an object literal, after which `/` would
 * be division), and it's treated as division-like here because that failure mode is the safe one - getting
 * it wrong just means `tryScanRegexLiteral` doesn't attempt a regex where one exists, falling back to the
 * character-level `canPrecedeString` mitigation instead. Treating `}` as expression-position instead would
 * risk the opposite: `tryScanRegexLiteral` succeeding on a real division by scanning ahead to the next
 * unrelated `/` in the file as if it were a closing delimiter, silently swallowing whatever real code -
 * including a genuine string or comment - sat in between.
 */
function isDivisionContext(content: string, slashIndex: number): boolean {
  let j = slashIndex - 1;
  while (j >= 0 && (content[j] === ' ' || content[j] === '\t')) j--;
  if (j < 0) return false;
  const ch = content[j];
  if (ch === ')' || ch === ']' || ch === '}') return true;
  if (!/[A-Za-z0-9_$]/.test(ch)) return false;
  let wordStart = j;
  while (wordStart > 0 && /[A-Za-z0-9_$]/.test(content[wordStart - 1])) wordStart--;
  return !REGEX_CONTEXT_KEYWORDS.has(content.slice(wordStart, j + 1));
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
      if (c === '/' && !isDivisionContext(content, this.i) && this.tryScanRegexLiteral()) {
        sawSlash = false;
        continue;
      }
      if (c === 'R' && this.tryScanRegExpCallArgs()) {
        continue;
      }
      if (c === '`') {
        this.scanTemplateLiteral();
        sawSlash = false;
        continue;
      }

      if ((c === '"' || c === "'") && (!sawSlash || canPrecedeString(content[this.i - 1]))) {
        this.scanQuotedString(c);
        // Deliberately not `sawSlash = false` here: an unrecognized regex can contain a quote pair
        // canPrecedeString accepts as a real string (e.g. the "quoted" in `` /"quoted"|it's/ ``, right
        // after the regex's own opening `/`) followed - still inside that same regex, no new `/` yet -
        // by a genuinely risky quote. Clearing `sawSlash` here would stop guarding that one.
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

  /**
   * Attempts to scan a regex literal starting at `this.i` (a `/` that `isDivisionContext` says isn't
   * division) and, on success, skips the whole thing - delimiters, body, and flags - as a single opaque
   * unit, exactly like any other code this scanner doesn't check. This is what actually fixes the
   * regex/quote ambiguity `canPrecedeString` can only mitigate: once the whole regex is consumed in one
   * step, nothing inside it - including a `[...]` class that opens with a quote right after `[`
   * (`` /['"]/ ``, `canPrecedeString`'s one remaining gap) - ever reaches the per-character quote dispatch
   * at all.
   *
   * Returns `false` (consuming nothing) if what follows isn't a validly-shaped regex body before a newline
   * or the end of the file - almost always because this actually was division and `isDivisionContext` got
   * it wrong (e.g. following a keyword not in `REGEX_CONTEXT_KEYWORDS`) - so the caller falls back to
   * treating `/` as an ordinary character.
   */
  private tryScanRegexLiteral(): boolean {
    const { content } = this;
    const start = this.i;
    let i = start + 1;
    let inClass = false;
    while (i < content.length) {
      const ch = content[i];
      if (ch === '\n') return false;
      if (ch === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      if (ch === '[') {
        inClass = true;
        i++;
        continue;
      }
      if (ch === ']') {
        inClass = false;
        i++;
        continue;
      }
      if (ch === '/' && !inClass) {
        i++;
        while (i < content.length && /[A-Za-z]/.test(content[i])) i++;
        this.i = i;
        return true;
      }
      i++;
    }
    return false;
  }

  /**
   * `RegExp(...)`/`new RegExp(...)` builds a regex from string arguments at runtime - those strings are
   * pattern/flags, not prose, so - like a regex literal's own body - they're never meant to be spell
   * checked (see README's "Known limitations"). Detects the call starting at `this.i` (positioned at the
   * `R` of "RegExp", with a word boundary on both ends so this can't misfire partway through a longer
   * identifier like `MyRegExpUtils`) and, on success, scans the whole argument list, skipping every string
   * literal inside without emitting it - covering both a `RegExp("pattern")`'s pattern and, since this
   * doesn't stop at the first argument, a two-argument `RegExp("pattern", "flags")`'s flags too - while
   * still recognizing comments inside normally. Returns `false` (consuming nothing) if "RegExp" isn't
   * actually the bare global name (e.g. `MyRegExpUtils`) or isn't followed by `(`, so the caller falls back
   * to treating `R` as an ordinary character.
   */
  private tryScanRegExpCallArgs(): boolean {
    const { content } = this;
    const start = this.i;
    if (isIdentChar(content[start - 1]) || !content.startsWith('RegExp', start)) return false;
    let i = start + 'RegExp'.length;
    if (isIdentChar(content[i])) return false;
    while (content[i] === ' ' || content[i] === '\t' || content[i] === '\n') i++;
    if (content[i] !== '(') return false;

    this.i = i + 1;
    let parenDepth = 0;
    while (this.i < content.length) {
      const c = content[this.i];
      if (c === '(') {
        parenDepth++;
        this.i++;
        continue;
      }
      if (c === ')') {
        if (parenDepth === 0) {
          this.i++;
          return true;
        }
        parenDepth--;
        this.i++;
        continue;
      }
      if (c === '/' && content[this.i + 1] === '/') {
        this.scanLineComment();
        continue;
      }
      if (c === '/' && content[this.i + 1] === '*') {
        this.scanBlockComment();
        continue;
      }
      if (c === '"' || c === "'") {
        this.skipQuotedStringSilently(c);
        continue;
      }
      this.i++;
    }
    return true; // ran off the end of the file mid-call; nothing more to do either way
  }

  /** Like `scanQuotedString`, but doesn't emit a `ParsedText` - used for RegExp's pattern/flags arguments. */
  private skipQuotedStringSilently(quote: string): void {
    const { content } = this;
    let i = this.i + 1;
    while (i < content.length) {
      if (content[i] === quote) {
        i++;
        break;
      }
      if (content[i] === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      i++;
    }
    this.i = i;
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
