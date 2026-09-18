import type { ParsedTags, ParsedText, Parser, ParseResult, SourceMap } from '@cspell/cspell-types';
import { customizeParser, stripCommentMarkers } from '@internal/utils';
import type { TagFilterOptions } from '@internal/utils';

/**
 * Which language-specific string/comment forms apply while scanning. Chosen once, up front, from the
 * file's extension (see {@link detectDialect}) - everything else about the scan (comments, plain quoted
 * strings, template/interpolation holes) is shared across every dialect.
 */
type Dialect = 'c' | 'csharp' | 'go' | 'java' | 'js' | 'php';

const EXTENSION_DIALECT: Readonly<Record<string, Dialect>> = {
  c: 'c',
  h: 'c',
  cpp: 'c',
  cc: 'c',
  cxx: 'c',
  'c++': 'c',
  hpp: 'c',
  hh: 'c',
  hxx: 'c',
  'h++': 'c',
  inl: 'c',
  cs: 'csharp',
  go: 'go',
  java: 'java',
  js: 'js',
  jsx: 'js',
  mjs: 'js',
  cjs: 'js',
  ts: 'js',
  tsx: 'js',
  mts: 'js',
  cts: 'js',
  php: 'php',
  phtml: 'php',
  php3: 'php',
  php4: 'php',
  php5: 'php',
  php7: 'php',
  php8: 'php',
};

/** Falls back to `'c'` (plain `//`, `/* *\/`, `'...'`, `"..."`) for an unrecognized extension. */
function detectDialect(filename: string): Dialect {
  const match = /\.([^./]+)$/.exec(filename);
  const ext = match?.[1]?.toLowerCase();
  return (ext && EXTENSION_DIALECT[ext]) || 'c';
}

const COMMENT_TAG: ParsedTags = { comment: true };
const COMMENT_LINE_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.line': true };
const COMMENT_LINE_DOC_TAG: ParsedTags = { ...COMMENT_LINE_TAG, 'comment.line.doc': true };
const COMMENT_BLOCK_TAG: ParsedTags = { ...COMMENT_TAG, 'comment.block': true };
const COMMENT_BLOCK_DOC_TAG: ParsedTags = { ...COMMENT_BLOCK_TAG, 'comment.block.doc': true };

const STRING_TAG: ParsedTags = { string: true };
const STRING_SINGLE_TAG: ParsedTags = { ...STRING_TAG, 'string.singleQuote': true };
const STRING_DOUBLE_TAG: ParsedTags = { ...STRING_TAG, 'string.doubleQuote': true };
const STRING_TEMPLATE_TAG: ParsedTags = { ...STRING_TAG, 'string.templateLiteral': true };
const STRING_VERBATIM_TAG: ParsedTags = { ...STRING_TAG, 'string.verbatim': true };
const STRING_INTERPOLATED_TAG: ParsedTags = { ...STRING_TAG, 'string.interpolated': true };
const STRING_VERBATIM_INTERPOLATED_TAG: ParsedTags = {
  ...STRING_TAG,
  'string.verbatim': true,
  'string.interpolated': true,
};
const STRING_RAW_TAG: ParsedTags = { ...STRING_TAG, 'string.raw': true };
const STRING_RAW_INTERPOLATED_TAG: ParsedTags = { ...STRING_TAG, 'string.raw': true, 'string.interpolated': true };
const STRING_TEXT_BLOCK_TAG: ParsedTags = { ...STRING_TAG, 'string.textBlock': true };
const STRING_HEREDOC_TAG: ParsedTags = { ...STRING_TAG, 'string.heredoc': true };
const STRING_NOWDOC_TAG: ParsedTags = { ...STRING_TAG, 'string.nowdoc': true };

const MARKUP_TAG: ParsedTags = { markup: true };

/**
 * Strips a line comment's marker (`//`, `#`, or C#'s `///`) - and one following space, if present - from
 * `rawText`. Unlike `@internal/utils`'s `stripCommentMarkers`, this takes the marker's length explicitly,
 * since this package's markers aren't all two characters.
 */
function stripLineMarker(rawText: string, markerLen: number): { text: string; map: SourceMap } {
  let skip = markerLen;
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

/**
 * Strips a fixed-length opening/closing delimiter pair from `rawText` (e.g. quotes, backticks, a heredoc's
 * `<<<ID\n` header and `\nID` footer). `hasClose` must reflect whether the scan actually found a genuine
 * closing delimiter (as opposed to running off the end of the file), since an unterminated literal has
 * nothing to strip at the end.
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

function isIdentChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_]/.test(ch);
}

/**
 * Advances past a backslash escape (`\x` as one unit) without stepping beyond `content.length` - a trailing
 * backslash with nothing after it (an unterminated literal ending mid-escape) has nothing left to escape, so
 * this just lands on the end of `content` instead of one past it. Every backslash-skip in this file goes
 * through here so a `range`/`map` built from the resulting index never exceeds `content.length`.
 */
function skipEscape(content: string, i: number): number {
  return Math.min(i + 2, content.length);
}

/** Skips a single `'...'`/`"..."` run (backslash-escaping the next character), used inside PHP's `{$...}`. */
function skipSimpleQuoted(content: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < content.length && content[i] !== quote) {
    i = content[i] === '\\' ? skipEscape(content, i) : i + 1;
  }
  return i < content.length ? i + 1 : i;
}

/**
 * Skips a PHP complex-interpolation `{$...}` hole inside a double-quoted string or heredoc, respecting
 * brace depth and any nested quotes (e.g. `"{$arr['key']}"`) - without this, the `'` in `'key'` would look
 * like the string's own closing quote to a naive scan.
 */
function skipPhpBraceInterpolation(content: string, start: number): number {
  let i = start;
  let depth = 0;
  while (i < content.length) {
    const c = content[i];
    if (c === '{') {
      depth++;
      i++;
      continue;
    }
    if (c === '}') {
      depth--;
      i++;
      if (depth === 0) return i;
      continue;
    }
    if (c === '"' || c === "'") {
      i = skipSimpleQuoted(content, i, c);
      continue;
    }
    if (c === '\\') {
      i = skipEscape(content, i);
      continue;
    }
    i++;
  }
  return i;
}

function findPhpOpenTag(content: string, from: number): { tagStart: number; codeStart: number } | undefined {
  const idx = content.indexOf('<?', from);
  if (idx === -1) return undefined;
  if (content.slice(idx, idx + 5).toLowerCase() === '<?php' && !isIdentChar(content[idx + 5])) {
    return { tagStart: idx, codeStart: idx + 5 };
  }
  if (content.startsWith('<?=', idx)) {
    return { tagStart: idx, codeStart: idx + 3 };
  }
  return { tagStart: idx, codeStart: idx + 2 };
}

/**
 * Scans `content` for comments and string/heredoc/text-block literals, emitting one `ParsedText` per
 * segment and silently skipping everything else (identifiers, keywords, punctuation, numbers) - the same
 * "only emit what should be spell checked" approach as `@cspell/parser-example`, extended to also emit
 * string contents (with per-form tags) and to understand each dialect's extra literal forms.
 *
 * PHP additionally toggles between an HTML "markup" pass-through mode and a PHP code mode at `<?php`/`<?=`/
 * `<?` and `?>` boundaries - see `scanPhpDocument`.
 */
class Scanner {
  private i = 0;
  readonly out: ParsedText[] = [];

  constructor(
    private readonly content: string,
    private readonly dialect: Dialect,
  ) {}

  run(): void {
    if (this.dialect === 'php') {
      this.scanPhpDocument();
    } else {
      this.scanCode(this.content.length, false, false);
    }
  }

  private scanPhpDocument(): void {
    const { content } = this;
    while (this.i < content.length) {
      const tag = findPhpOpenTag(content, this.i);
      const htmlEnd = tag ? tag.tagStart : content.length;
      if (htmlEnd > this.i) {
        const text = content.slice(this.i, htmlEnd);
        this.out.push({ text, rawText: text, range: [this.i, htmlEnd], tags: MARKUP_TAG });
      }
      if (!tag) {
        this.i = content.length;
        return;
      }
      this.i = tag.codeStart;
      this.scanCode(content.length, false, true);
    }
  }

  /**
   * Scans code from `this.i` up to `end`. Two special exits, both leaving `this.i` just past the character
   * that triggered them:
   * - `stopAtUnmatchedBrace`: a `}` at brace-depth 0 - used to find the end of a `${...}`/`{...}`
   *   interpolation hole without knowing its end index up front.
   * - `phpAware`: a top-level `?>` - PHP's own dialect drops back to HTML markup at that point.
   */
  private scanCode(end: number, stopAtUnmatchedBrace: boolean, phpAware: boolean): void {
    const { content, dialect } = this;
    let braceDepth = 0;

    while (this.i < end) {
      const c = content[this.i];

      if (phpAware && c === '?' && content[this.i + 1] === '>') {
        this.i += 2;
        return;
      }
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
        if (this.scanLineComment(phpAware, false)) return;
        continue;
      }
      if (dialect === 'php' && c === '#' && content[this.i + 1] !== '[') {
        if (this.scanLineComment(phpAware, true)) return;
        continue;
      }
      if (c === '/' && content[this.i + 1] === '*') {
        this.scanBlockComment();
        continue;
      }
      if (dialect === 'c' && this.tryScanCppRawString()) continue;
      if (c === '`' && dialect === 'js') {
        this.scanTemplateLiteral();
        continue;
      }
      if (c === '`' && dialect === 'go') {
        this.scanGoRawString();
        continue;
      }
      if (dialect === 'csharp' && (c === '@' || c === '$') && this.tryScanCSharpString()) continue;
      if (dialect === 'csharp' && c === '"' && content[this.i + 1] === '"' && content[this.i + 2] === '"') {
        const start = this.i;
        let q = this.i;
        while (content[q] === '"') q++;
        this.scanCSharpRawString(start, q - start, false);
        continue;
      }
      if (c === '"') {
        if (dialect === 'java' && content[this.i + 1] === '"' && content[this.i + 2] === '"') {
          this.scanJavaTextBlock();
        } else {
          this.scanQuotedString('"');
        }
        continue;
      }
      if (c === "'") {
        this.scanQuotedString("'");
        continue;
      }
      if (dialect === 'php' && content.startsWith('<<<', this.i)) {
        this.scanHeredoc();
        continue;
      }

      this.i++;
    }
  }

  /** Returns `true` if a PHP `?>` ended the comment (and PHP mode) early - `scanCode` must stop right away. */
  private scanLineComment(phpAware: boolean, isHash: boolean): boolean {
    const { content, dialect } = this;
    const start = this.i;
    const isTripleSlash = !isHash && dialect === 'csharp' && content[this.i + 2] === '/' && content[this.i + 3] !== '/';
    const markerLen = isHash ? 1 : isTripleSlash ? 3 : 2;

    let end = content.length;
    let closesPhp = false;
    for (let j = this.i; j < content.length; j++) {
      const ch = content[j];
      if (ch === '\n') {
        end = j;
        break;
      }
      if (phpAware && ch === '?' && content[j + 1] === '>') {
        end = j;
        closesPhp = true;
        break;
      }
    }

    const rawText = content.slice(start, end);
    const { text, map } = stripLineMarker(rawText, markerLen);
    const tags = isTripleSlash ? COMMENT_LINE_DOC_TAG : COMMENT_LINE_TAG;
    this.out.push({ text, rawText, map, range: [start, end], tags });
    this.i = closesPhp ? end + 2 : end;
    return closesPhp;
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

  /** Plain `'...'`/`"..."` strings, common to every dialect. PHP's `"..."` also allows `{$...}` holes. */
  private scanQuotedString(quote: string): void {
    const { content, dialect } = this;
    const start = this.i;
    const allowInterpolation = dialect === 'php' && quote === '"';
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
      if (allowInterpolation && content[i] === '{' && content[i + 1] === '$') {
        i = skipPhpBraceInterpolation(content, i);
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

  /** A JS/TS template literal, split into `string.templateLiteral` fragments around `${...}` holes. */
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
        this.scanCode(content.length, true, false);
        i = this.i;
        fragStart = i;
        continue;
      }
      i++;
    }
  }

  /**
   * A Go raw string: backtick-delimited, no escapes, and no interpolation - unlike a JS/TS template literal,
   * which also uses backticks but for a fundamentally different form. Go's own grammar disallows a backtick
   * inside a raw string at all, so the next backtick is unambiguously the close, with nothing to skip over.
   */
  private scanGoRawString(): void {
    const { content } = this;
    const start = this.i;
    const closeIndex = content.indexOf('`', start + 1);
    const closed = closeIndex !== -1;
    const end = closed ? closeIndex + 1 : content.length;
    const rawText = content.slice(start, end);
    const { text, map } = stripDelimited(rawText, 1, 1, closed);
    this.out.push({ text, rawText, map, range: [start, end], tags: STRING_RAW_TAG });
    this.i = end;
  }

  /** A non-empty `[start, end)` slice of `content`, emitted as-is (no transform, so no `map` needed). */
  private emitFragment(start: number, end: number, tags: ParsedTags): void {
    if (end <= start) return;
    const text = this.content.slice(start, end);
    this.out.push({ text, rawText: text, range: [start, end], tags });
  }

  /**
   * Dispatches a C# string starting with `@` or `$` (verbatim, interpolated, or both) - including the
   * triple-or-more-quote "raw string literal" form, which either prefix can also introduce. Returns `false`
   * (consuming nothing) for a bare `@identifier` (C#'s syntax for using a keyword as an identifier), which
   * isn't a string at all.
   */
  private tryScanCSharpString(): boolean {
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
      this.scanCSharpRawString(start, quoteRun, interpolated);
    } else if (interpolated) {
      this.scanCSharpInterpolatedString(start, verbatim);
    } else {
      this.scanCSharpVerbatimString(start);
    }
    return true;
  }

  /** `@"..."` - doubled `""` is an escaped quote; no backslash escapes. */
  private scanCSharpVerbatimString(start: number): void {
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
    this.out.push({ text, rawText, map, range: [start, end], tags: STRING_VERBATIM_TAG });
    this.i = end;
  }

  /**
   * `$"..."` / `$@"..."` / `@$"..."` - split into fragments around `{...}` holes, the same way
   * `scanTemplateLiteral` splits on `${...}`. `{{`/`}}` are literal braces, not holes. A verbatim
   * (`@`-combined) interpolated string still doubles `""` for a literal quote and doesn't use backslash
   * escapes; a plain `$"..."` uses ordinary backslash escapes instead.
   */
  private scanCSharpInterpolatedString(start: number, verbatim: boolean): void {
    const { content } = this;
    const openLen = this.i - start + 1;
    const tag = verbatim ? STRING_VERBATIM_INTERPOLATED_TAG : STRING_INTERPOLATED_TAG;
    let i = start + openLen;
    let fragStart = i;
    for (;;) {
      if (i >= content.length) {
        this.emitFragment(fragStart, i, tag);
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
        this.emitFragment(fragStart, i, tag);
        i++;
        this.i = i;
        return;
      }
      if (c === '{') {
        if (content[i + 1] === '{') {
          i += 2;
          continue;
        }
        this.emitFragment(fragStart, i, tag);
        i++;
        this.i = i;
        this.scanCode(content.length, true, false);
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
  private scanCSharpRawString(start: number, quoteRun: number, interpolated: boolean): void {
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
    this.out.push({
      text,
      rawText,
      map,
      range: [start, end],
      tags: interpolated ? STRING_RAW_INTERPOLATED_TAG : STRING_RAW_TAG,
    });
    this.i = end;
  }

  /** Java's `"""..."""` text block - fixed 3-quote delimiter, ordinary backslash escapes still apply. */
  private scanJavaTextBlock(): void {
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
    this.out.push({ text, rawText, map, range: [start, end], tags: STRING_TEXT_BLOCK_TAG });
    this.i = end;
  }

  /**
   * A C/C++11 raw string: an optional `u8`/`u`/`U`/`L` encoding prefix, then `R"delim(...)delim"`, where
   * `delim` is 0-16 characters up to the `(`. Requires a non-identifier character (or start of file)
   * immediately before the prefix, so this can't misfire partway through an ordinary identifier that
   * happens to end in `R`. Returns `false` (consuming nothing) if the pattern doesn't actually match, so
   * the caller falls through to treating `R`/the prefix letter as an ordinary skipped character.
   */
  private tryScanCppRawString(): boolean {
    const { content } = this;
    const prev = content[this.i - 1];
    if (isIdentChar(prev)) return false;
    const match = /^(?:u8|u|U|L)?R"/.exec(content.slice(this.i, this.i + 4));
    if (!match) return false;

    const start = this.i;
    const prefixLen = match[0].length;
    const delimStart = start + prefixLen;
    let j = delimStart;
    while (j < content.length && content[j] !== '(' && j - delimStart < 17) j++;
    if (content[j] !== '(') return false;

    const delim = content.slice(delimStart, j);
    const closer = ')' + delim + '"';
    const closeIndex = content.indexOf(closer, j + 1);
    const closed = closeIndex !== -1;
    const end = closed ? closeIndex + closer.length : content.length;
    const rawText = content.slice(start, end);
    const openLen = prefixLen + delim.length + 1;
    const { text, map } = stripDelimited(rawText, openLen, closer.length, closed);
    this.out.push({ text, rawText, map, range: [start, end], tags: STRING_RAW_TAG });
    this.i = end;
    return true;
  }

  /**
   * PHP `<<<ID ... ID` heredoc (interpolated, like a double-quoted string) or `<<<'ID' ... ID` nowdoc
   * (literal, like a single-quoted string). Unlike a quoted string, the closing marker is found by matching
   * a whole line (`ID` at the start of a line, not immediately followed by another identifier character,
   * per PHP's flexible heredoc syntax), so nested quotes/braces in the body never need special handling the
   * way `scanQuotedString`'s PHP interpolation does.
   */
  private scanHeredoc(): void {
    const { content } = this;
    const start = this.i;
    let i = start + 3;
    while (content[i] === ' ' || content[i] === '\t') i++;

    let quote: string | undefined;
    if (content[i] === "'" || content[i] === '"') {
      quote = content[i];
      i++;
    }
    const idStart = i;
    while (i < content.length && /[A-Za-z0-9_]/.test(content[i])) i++;
    const id = content.slice(idStart, i);
    if (!id) {
      // Not a real heredoc after all - just consume the '<' and let ordinary scanning re-examine the rest.
      this.i = start + 1;
      return;
    }
    if (quote && content[i] === quote) i++;

    const lineEnd = content.indexOf('\n', i);
    const bodyStart = lineEnd === -1 ? content.length : lineEnd + 1;

    const closeRe = new RegExp(`^[ \\t]*${id}(?![A-Za-z0-9_])`, 'm');
    const rest = content.slice(bodyStart);
    const found = closeRe.exec(rest);
    const bodyEnd = found ? bodyStart + found.index : content.length;
    const markerEnd = found ? bodyEnd + found[0].length : content.length;

    const rawText = content.slice(start, markerEnd);
    const headerLen = bodyStart - start;
    const footerLen = markerEnd - bodyEnd;
    const { text, map } = stripDelimited(rawText, headerLen, footerLen, found !== null);
    this.out.push({
      text,
      rawText,
      map,
      range: [start, markerEnd],
      tags: quote === "'" ? STRING_NOWDOC_TAG : STRING_HEREDOC_TAG,
    });
    this.i = markerEnd;
  }
}

/**
 * Extracts comments and string/heredoc/text-block literals from source in any of this parser's supported
 * dialects (see {@link supportedFileTypes}), chosen from `filename`'s extension. See the `Scanner` class for
 * the actual scanning logic.
 */
export function parse(content: string, filename: string): ParseResult {
  const scanner = new Scanner(content, detectDialect(filename));
  scanner.run();
  return { content, filename, parsedTexts: scanner.out };
}

export const parser: Parser = {
  name: 'strings-comments',
  parse,
};

export const supportedFileTypes: string[] = [
  'c',
  'cpp',
  'csharp',
  'go',
  'java',
  'javascript',
  'javascriptreact',
  'php',
  'typescript',
  'typescriptreact',
];

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
 * Create a parser for C, C++, C#, Go, Java, JavaScript/JSX, TypeScript/TSX, and PHP files. You can set the
 * name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'doc-comments-only',
 *   tags: { '*': false, 'comment.block.doc': true, 'comment.line.doc': true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'java', parser: 'doc-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
