import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import { customizeParser } from '@internal/utils';
import type { TagFilterOptions } from '@internal/utils';

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_BLOCK_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.block': true };

const STRING_TAG: ParsedTags = { string: true };
const STRING_SINGLE_TAG: ParsedTags = { ...STRING_TAG, 'string.singleQuote': true };
const STRING_DOUBLE_TAG: ParsedTags = { ...STRING_TAG, 'string.doubleQuote': true };
const STRING_HEREDOC_TAG: ParsedTags = { ...STRING_TAG, 'string.heredoc': true };

/**
 * Strips a fixed-length opening/closing delimiter pair from `rawText` (quotes, or a heredoc's
 * `<<~ID\n`-style header and `ID`-style footer). `hasClose` must come from the scan itself (whether it
 * actually found a genuine closing delimiter, vs. running off the end of the file) - it can't be inferred
 * from `rawText`'s length alone, since a well-formed literal can end exactly at EOF.
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
 * Strips a `#` line comment's marker - and one following space, if present - from `rawText`. Unlike
 * `@internal/utils`'s `stripCommentMarkers` (built for `//`/`/* *\/`), Ruby's line-comment marker is a
 * single character, so this package has its own tiny equivalent rather than reusing that helper.
 */
function stripHashComment(rawText: string): { text: string; map: SourceMap } {
  let skip = 1; // '#'
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

/**
 * Advances past a backslash escape (`\x` as one unit), clamped to `content.length` for a trailing backslash
 * at EOF. Treating every `\x` as a generic 2-char skip-unit - not just the handful Ruby interprets specially
 * - is harmless for boundary-finding, and also correctly handles `\#{` (an escaped `#` that can't open
 * interpolation): consuming it as one unit keeps the following `{` from being read as `#{`'s second half.
 */
function skipEscape(content: string, i: number): number {
  return Math.min(i + 2, content.length);
}

function isIdentChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_]/.test(ch);
}

function isIdentStartChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z_]/.test(ch);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * `false` for a character that can never legitimately precede a real string's opening quote in valid Ruby
 * (an identifier character - `foo"bar"` isn't valid - or another quote - `"a"'b'` isn't either). Seeing one
 * right before a `'`/`"` signals the quote is actually inside an unrecognized regex character class (e.g.
 * both quotes in `` /[\w"']/ ``), not a real string. Doesn't catch every case - a class opening with a quote
 * right after `[` (`` /['"]/ ``) is genuinely ambiguous with a real string after an array bracket - see
 * `README.md`'s "Known limitations".
 *
 * Only called once a bare `/` has been seen since the last reset point (`sawSlash`) - regex literals are
 * rare, so this skips the check entirely for the overwhelming majority of quotes.
 */
function canPrecedeString(prev: string | undefined): boolean {
  return prev === undefined || !/[A-Za-z0-9_'"]/.test(prev);
}

/**
 * Keywords and common method names after which `/`, `<<`, or `%` begins a brand-new literal (regex, heredoc,
 * or percent-literal), never continues a value as a binary operator - shared across all three ambiguities in
 * {@link isOperandContext} below, since each boils down to "did the token before this one produce a value?"
 * Not exhaustive by design - just Ruby's own control-flow keywords plus a handful of methods commonly called
 * without parens directly on a literal argument (`puts`, `raise`, `gsub`, ...).
 */
const EXPRESSION_START_KEYWORDS = new Set([
  'if',
  'unless',
  'while',
  'until',
  'case',
  'when',
  'and',
  'or',
  'not',
  'then',
  'else',
  'elsif',
  'begin',
  'do',
  'in',
  'return',
  'yield',
  'raise',
  'puts',
  'print',
  'match',
  'gsub',
  'sub',
  'scan',
  'split',
  'grep',
]);

/**
 * `true` if the significant character before `content[index]` already produced a value - a `)`/`]`/`}`, a
 * closing quote, or an identifier/number not in {@link EXPRESSION_START_KEYWORDS} - meaning the token at
 * `index` (`/`, `<<`, or `%`) is a binary operator (division, left-shift/append, or modulo) continuing that
 * value, not opening a new literal (regex, heredoc, or percent-literal). Same "what precedes it" resolution a
 * real Ruby lexer uses for these ambiguities - all three share the shape of a token that's either a binary
 * operator or a literal opener, decided only by what came before it.
 *
 * Not exhaustive - a bare (no-parens) literal argument to a method call outside that keyword set won't be
 * recognized - and deliberately biased toward treating an ambiguous `}` as a value: getting it wrong there
 * only misses a literal (safe), vs. misreading real division/append/modulo as a literal opener that swallows
 * real code after it (unsafe). See `README.md`'s "Known limitations".
 */
function isOperandContext(content: string, index: number): boolean {
  let j = index - 1;
  while (j >= 0 && (content[j] === ' ' || content[j] === '\t')) j--;
  if (j < 0) return false;
  const ch = content[j];
  if (ch === ')' || ch === ']' || ch === '}' || ch === "'" || ch === '"') return true;
  if (!/[A-Za-z0-9_]/.test(ch)) return false;
  let wordStart = j;
  while (wordStart > 0 && /[A-Za-z0-9_]/.test(content[wordStart - 1])) wordStart--;
  return !EXPRESSION_START_KEYWORDS.has(content.slice(wordStart, j + 1));
}

/** Optional type letter after `%` (`%w`, `%i`, `%q`, `%Q`, `%r`, `%s`, `%x`) - bare `%(...)` has none. */
const PERCENT_LITERAL_TYPES = new Set(['w', 'W', 'i', 'I', 'q', 'Q', 'r', 's', 'x']);

/**
 * Delimiter characters this parser recognizes as opening a percent-literal. Ruby actually allows almost any
 * non-alphanumeric character here, but this stays deliberately narrow - the common bracket pairs, plus a
 * handful of same-character delimiters seen in real code (`%r{...}` dominates for regex; `%|...|`, `%!...!`
 * show up occasionally) - rather than "anything non-alphanumeric." A wider set raises the odds of misreading
 * an unusual modulo expression as a literal opener, which (per {@link isOperandContext}'s doc comment) is the
 * failure direction that swallows real code; missing an exotic percent-literal delimiter is the safe one.
 */
const PERCENT_LITERAL_OPEN_DELIMS = new Set(['(', '[', '{', '<', '|', '!', '#', '/', '~', '^']);
const PERCENT_LITERAL_CLOSE_FOR_OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' };

/** The header info a heredoc opener (`<<~ID`, `<<-ID`, `<<ID`, and their quoted forms) resolves to. */
interface HeredocHeader {
  /** Offset right after the header line's own trailing newline - where the heredoc's body begins. */
  readonly bodyStart: number;
  /** `false` only for a single-quoted marker (`<<~'ID'`) - Ruby's literal, non-interpolated form. */
  readonly interpolated: boolean;
  /** The identifier the closing marker line must match. */
  readonly markerId: string;
}

/**
 * Scans Ruby source for comments and string/heredoc literals, yielding one `ParsedText` per segment. Regex
 * literals and percent-literals are recognized and consumed as opaque units but never emitted; everything
 * else (identifiers, keywords, punctuation, numbers, symbols) is silently skipped - the same "only emit what
 * should be spell checked" approach as `@cspell/parser-example`, extended to also emit string/heredoc
 * contents.
 *
 * Emits lazily via generators rather than collecting into an array - nothing here holds onto a tree or other
 * resource a consumer could leak by not fully draining the result.
 */
class Scanner {
  private i = 0;

  constructor(private readonly content: string) {}

  *run(): Generator<ParsedText> {
    yield* this.scanCode(this.content.length, false);
  }

  /**
   * Scans code from `this.i` up to `end`. `stopAtUnmatchedBrace: true` makes this return as soon as it sees
   * a `}` at brace-depth 0, having consumed it - used to find the end of a `#{...}` interpolation hole
   * (inside a double-quoted string or an interpolated heredoc) without knowing its end index up front.
   */
  private *scanCode(end: number, stopAtUnmatchedBrace: boolean): Generator<ParsedText> {
    const { content } = this;
    let braceDepth = 0;
    // Sticky, not toggled: true once a bare `/` has appeared since the last reset point (start of scan, a
    // newline, or a recognized token) - see canPrecedeString's doc comment for why, and the TypeScript-family
    // parser this was ported from for why sticky rather than per-`/` toggling.
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

      // "=begin" only opens a block comment at column 0 (start of file, or right after a newline) - see
      // README.md's "How it works" and CONTRIBUTING.md for why this check exists at all.
      if (c === '=' && (this.i === 0 || content[this.i - 1] === '\n') && content.startsWith('=begin', this.i)) {
        yield this.scanBeginEndComment();
        sawSlash = false;
        continue;
      }

      if (c === '#') {
        yield this.scanLineComment();
        sawSlash = false;
        continue;
      }

      if (c === '<' && n === '<' && !isOperandContext(content, this.i)) {
        const header = this.parseHeredocHeader();
        if (header) {
          yield* this.scanHeredocBody(header);
          sawSlash = false;
          continue;
        }
      }

      if (c === '/' && !isOperandContext(content, this.i) && this.tryScanRegexLiteral()) {
        sawSlash = false;
        continue;
      }

      if (c === '%' && !isOperandContext(content, this.i) && this.tryScanPercentLiteral()) {
        sawSlash = false;
        continue;
      }

      if (c === "'" && (!sawSlash || canPrecedeString(content[this.i - 1]))) {
        yield this.scanSingleQuotedString();
        // Deliberately not `sawSlash = false` here - see the reference TypeScript-family parser's
        // equivalent scanQuotedString call site for the exact regex shape this protects against.
        continue;
      }
      if (c === '"' && (!sawSlash || canPrecedeString(content[this.i - 1]))) {
        yield* this.scanDoubleQuotedString();
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

  private scanLineComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    const newlineIndex = content.indexOf('\n', start);
    const end = newlineIndex === -1 ? content.length : newlineIndex;
    const rawText = content.slice(start, end);
    const { text, map } = stripHashComment(rawText);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: COMMENT_LINE_TAG };
  }

  /**
   * An `=begin` ... `=end` block comment. Per Ruby's spec both markers are only recognized at column 0 (the
   * caller already checked `=begin`'s), and any trailing text on either marker's own line (`=begin rdoc`,
   * `=end # note`) is real Ruby syntax that's simply ignored, not part of the comment's spell-checked text -
   * mirrored here by excluding both full marker lines from `text` via `stripDelimited`, the same way a
   * heredoc's header/footer lines are excluded from its body.
   */
  private scanBeginEndComment(): ParsedText {
    const { content } = this;
    const start = this.i;
    const headerLineEnd = content.indexOf('\n', start);
    const bodyStart = headerLineEnd === -1 ? content.length : headerLineEnd + 1;

    const closeRe = /^=end.*$/m;
    const rest = content.slice(bodyStart);
    const found = closeRe.exec(rest);
    const bodyEnd = found ? bodyStart + found.index : content.length;
    const footerEnd = found ? bodyEnd + found[0].length : content.length;

    const rawText = content.slice(start, footerEnd);
    const headerLen = bodyStart - start;
    const footerLen = footerEnd - bodyEnd;
    const { text, map } = stripDelimited(rawText, headerLen, footerLen, found !== null);
    this.i = footerEnd;
    return { text, rawText, map, range: [start, footerEnd], tags: COMMENT_BLOCK_TAG };
  }

  /** A plain `'...'` string - Ruby only treats `\\` and `\'` specially, but the generic `skipEscape` used
   * for boundary-finding elsewhere in this codebase handles that (and every other `\x`) harmlessly. */
  private scanSingleQuotedString(): ParsedText {
    const { content } = this;
    const start = this.i;
    let i = start + 1;
    let closed = false;
    while (i < content.length) {
      if (content[i] === "'") {
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
    const { text, map } = stripDelimited(rawText, 1, 1, closed);
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: STRING_SINGLE_TAG };
  }

  /** A `"..."` string, split into `string.doubleQuote` fragments around `#{...}` interpolation holes. */
  private *scanDoubleQuotedString(): Generator<ParsedText> {
    const { content } = this;
    let i = this.i + 1;
    let fragStart = i;
    for (;;) {
      if (i >= content.length) {
        yield* this.emitFragment(fragStart, i, STRING_DOUBLE_TAG);
        this.i = i;
        return;
      }
      const c = content[i];
      if (c === '\\') {
        i = skipEscape(content, i);
        continue;
      }
      if (c === '"') {
        yield* this.emitFragment(fragStart, i, STRING_DOUBLE_TAG);
        i++;
        this.i = i;
        return;
      }
      if (c === '#' && content[i + 1] === '{') {
        yield* this.emitFragment(fragStart, i, STRING_DOUBLE_TAG);
        i += 2;
        this.i = i;
        yield* this.scanCode(content.length, true);
        i = this.i;
        fragStart = i;
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

  /**
   * Parses a heredoc opener (`<<~ID`, `<<-ID`, `<<ID`, or any of those with a `'ID'`/`"ID"` marker) starting
   * at `this.i` (already known to be a `<<` in an "expression start" position - see `isOperandContext`),
   * without consuming anything or emitting a `ParsedText` yet. Returns `undefined` if what follows isn't
   * actually a validly-shaped heredoc marker (most commonly a real `<<`/`<<=` left-shift operator that
   * `isOperandContext` couldn't rule out), so the caller falls through to treating `<` as an ordinary
   * character.
   *
   * Deliberately does **not** scan the rest of the current line as code before jumping to the body: real
   * Ruby allows more code after the marker on the same line (`foo(<<~A, <<~B)`, `<<~A.freeze`), but this
   * scanner treats everything from the `<<` through the body's closing marker line as a single opaque unit,
   * the same simplification `@cspell/parser-strings-comments`'s PHP heredoc support already ships - see
   * `README.md`'s "Known limitations".
   */
  private parseHeredocHeader(): HeredocHeader | undefined {
    const { content } = this;
    let i = this.i + 2; // past '<<'
    if (content[i] === '~' || content[i] === '-') i++;

    let quote: string | undefined;
    if (content[i] === "'" || content[i] === '"') {
      quote = content[i];
      i++;
    }

    if (!isIdentStartChar(content[i])) return undefined;
    const idStart = i;
    while (i < content.length && isIdentChar(content[i])) i++;
    const markerId = content.slice(idStart, i);

    if (quote) {
      if (content[i] !== quote) return undefined;
      i++;
    }

    const lineEnd = content.indexOf('\n', i);
    const bodyStart = lineEnd === -1 ? content.length : lineEnd + 1;
    return { bodyStart, interpolated: quote !== "'", markerId };
  }

  /**
   * Scans a heredoc's body, given its already-parsed {@link HeredocHeader}, and emits it as one or more
   * `string.heredoc`-tagged fragments (split around `#{...}` holes if `interpolated`, exactly like a
   * double-quoted string, or as a single literal fragment otherwise - see `scanDoubleQuotedString`). The
   * closing marker is found by matching a whole line (`ID` alone, with only leading/trailing whitespace
   * allowed around it - a body line that merely starts with the marker but continues with anything else,
   * e.g. `SQL:`, is never mistaken for the terminator) - the same
   * "match a whole line" approach `@cspell/parser-strings-comments`'s PHP heredoc support uses for its own
   * `<<<ID ... ID` closing marker, just with Ruby's different opening syntax.
   *
   * No dedent simulation: a `<<~ID` squiggly heredoc's real, evaluated value has Ruby's common-leading-
   * whitespace stripped, but that transform doesn't matter for spell-checking (leading whitespace isn't a
   * word), so the raw, un-dedented body text is extracted byte for byte - see `README.md`'s "Known
   * limitations".
   */
  private *scanHeredocBody(header: HeredocHeader): Generator<ParsedText> {
    const { content } = this;
    const { bodyStart, interpolated, markerId } = header;

    const closeRe = new RegExp(`^[ \\t]*${escapeRegExp(markerId)}[ \\t]*$`, 'm');
    const rest = content.slice(bodyStart);
    const found = closeRe.exec(rest);
    const bodyEnd = found ? bodyStart + found.index : content.length;
    const markerEnd = found ? bodyEnd + found[0].length : content.length;

    if (!interpolated) {
      yield* this.emitFragment(bodyStart, bodyEnd, STRING_HEREDOC_TAG);
    } else {
      this.i = bodyStart;
      let fragStart = bodyStart;
      while (this.i < bodyEnd) {
        const c = content[this.i];
        if (c === '\\') {
          this.i = skipEscape(content, this.i);
          continue;
        }
        if (c === '#' && content[this.i + 1] === '{') {
          yield* this.emitFragment(fragStart, this.i, STRING_HEREDOC_TAG);
          this.i += 2;
          yield* this.scanCode(bodyEnd, true);
          fragStart = this.i;
          continue;
        }
        this.i++;
      }
      yield* this.emitFragment(fragStart, bodyEnd, STRING_HEREDOC_TAG);
    }
    this.i = markerEnd;
  }

  /**
   * Attempts to scan a regex literal (`/pattern/flags`) starting at `this.i` (a `/` that `isOperandContext`
   * says isn't division) and, on success, skips the whole thing - delimiters, body, and flags - as a single
   * opaque unit, exactly like any other code this scanner doesn't check. Per this package's scope
   * (`README.md`'s "Known limitations"), a recognized regex's content is never spell checked at all - unlike
   * a string, nothing is ever emitted for it, so it's simply consumed and skipped.
   *
   * This is what actually fixes the regex/quote ambiguity `canPrecedeString` can only mitigate: once the
   * whole regex is consumed in one step, nothing inside it - including a `[...]` class that opens with a
   * quote right after `[` (`` /['"]/ ``, `canPrecedeString`'s one remaining gap) - ever reaches the quote
   * dispatch at all.
   *
   * Returns `false` (consuming nothing) if what follows isn't a validly-shaped regex body before a newline
   * or the end of the file - either because this actually was division and `isOperandContext` got it wrong,
   * or because the regex genuinely spans multiple lines (a real but rare Ruby feature this scanner doesn't
   * support - see `README.md`) - so the caller falls back to treating `/` as an ordinary character.
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
   * Attempts to scan a percent-literal (`%w[]`, `%i[]`, `%q()`, `%Q{}`, `%r{}`, `%s()`, `%x()`, or a
   * type-letter-less `%(...)`) starting at `this.i`, and on success skips it as one opaque unit - like a
   * regex literal, never spell checked (see `README.md`'s "Known limitations"), so no `ParsedText` is
   * emitted for it. This closes a real correctness gap: an unrecognized percent-literal's embedded quote
   * (`%w[don't stop]`) would otherwise reach the quote dispatch below and kick off a runaway string scan
   * that swallows real code after it - see `CONTRIBUTING.md`.
   *
   * A bracket-style delimiter (`(`, `[`, `{`, `<`) nests - `%w(foo (bar) baz)` is one literal - so `depth`
   * tracks further opens, closing only once it returns to 0; a same-character delimiter (`%|...|`) can't
   * nest, so any occurrence of it closes the literal immediately.
   *
   * Returns `false` (consuming nothing) if what follows `%` isn't one of {@link PERCENT_LITERAL_OPEN_DELIMS},
   * so the caller falls back to treating `%` as ordinary code (division/modulo, most commonly).
   */
  private tryScanPercentLiteral(): boolean {
    const { content } = this;
    const start = this.i;
    let j = start + 1;
    const typeLetter = content[j];
    const isRegex = typeLetter === 'r';
    if (typeLetter !== undefined && PERCENT_LITERAL_TYPES.has(typeLetter)) j++;

    const open = content[j];
    if (!open || !PERCENT_LITERAL_OPEN_DELIMS.has(open)) return false;
    const close = PERCENT_LITERAL_CLOSE_FOR_OPEN[open] ?? open;
    const nests = close !== open;
    j++;

    let depth = 1;
    while (j < content.length && depth > 0) {
      const ch = content[j];
      if (ch === '\\') {
        j = skipEscape(content, j);
        continue;
      }
      if (nests && ch === open) {
        depth++;
      } else if (ch === close) {
        depth--;
      }
      j++;
    }
    // depth > 0 here means the loop ran off the end of the file unterminated - j is already content.length,
    // so this extends the literal to EOF rather than leaving the opener behind with its embedded quote(s)
    // still live to misread, the same reasoning an unterminated heredoc is extended to EOF for.
    if (isRegex && depth === 0) {
      while (j < content.length && /[A-Za-z]/.test(content[j])) j++;
    }
    this.i = j;
    return true;
  }
}

/**
 * Extracts comments and string/heredoc literals from Ruby source. See the `Scanner` class for the actual
 * scanning logic.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const parser: Parser = {
  name: 'ruby-strings-comments',
  parse,
};

export const supportedFileTypes: string[] = ['ruby'];

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
 * Create a parser for Ruby files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-ruby-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'no-heredocs',
 *   tags: { 'string.heredoc': false },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'ruby', parser: 'no-heredocs' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
