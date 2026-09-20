import type { ParsedTags, ParsedText, ParseResult, SourceMap } from '@cspell/cspell-types';
import type { ParserTags, PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser, stripCommentMarkers } from '@internal/utils';

const COMMENT_TAG: ParsedTags = Object.freeze({ comment: true });
const COMMENT_LINE_TAG: ParsedTags = Object.freeze({ ...COMMENT_TAG, 'comment.line': true });
const COMMENT_BLOCK_TAG: ParsedTags = Object.freeze({ ...COMMENT_TAG, 'comment.block': true });
const COMMENT_BLOCK_DOC_TAG: ParsedTags = Object.freeze({ ...COMMENT_BLOCK_TAG, 'comment.block.doc': true });

const STRING_TAG: ParsedTags = Object.freeze({ string: true });
const STRING_SINGLE_TAG: ParsedTags = Object.freeze({ ...STRING_TAG, 'string.singleQuote': true });
const STRING_DOUBLE_TAG: ParsedTags = Object.freeze({ ...STRING_TAG, 'string.doubleQuote': true });
const STRING_HEREDOC_TAG: ParsedTags = Object.freeze({ ...STRING_TAG, 'string.heredoc': true });
const STRING_NOWDOC_TAG: ParsedTags = Object.freeze({ ...STRING_TAG, 'string.nowdoc': true });

/**
 * The HTML markup pass-through segments outside `<?php ... ?>` - deliberately its own top-level tag, not
 * nested under `string` or `comment`, since it isn't either.
 */
const MARKUP_TAG: ParsedTags = Object.freeze({ markup: true });

/**
 * Strips a line comment's marker - PHP's own markers aren't a fixed length: `#` is 1 character, `//` is 2 -
 * and one following space, if present, from `rawText`. Unlike `@internal/utils`'s `stripCommentMarkers`
 * (used for block comments, whose marker is always `/*`), this takes the marker's length explicitly.
 */
function stripLineMarker(rawText: string, markerLen: number): { text: string; map: SourceMap } {
  let skip = markerLen;
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

/**
 * Strips a fixed-length opening/closing delimiter pair from `rawText` (quotes, or a heredoc/nowdoc's
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
 * like the string's own closing quote to a naive scan. The hole's contents are skipped over as part of the
 * same string, not split out into their own `ParsedText` - see `CONTRIBUTING.md` for why.
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

/**
 * Finds the next PHP open tag at or after `from`: `<?php` (case-insensitively, with a word-boundary check
 * so it doesn't misfire mid-identifier), `<?=` (short-echo), or a bare `<?`. Returns where the tag itself
 * starts and where PHP code starts right after it, or `undefined` if there's no more `<?` in the file.
 */
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
 * Scans PHP source for comments and string/heredoc/nowdoc literals, yielding one `ParsedText` per segment
 * and skipping everything else (identifiers, keywords, punctuation, numbers).
 *
 * PHP alone among this repo's split-out language families has a genuine two-mode structure: a file toggles
 * between HTML markup (passed through untagged as `markup`) and PHP code at `<?php`/`<?=`/`<?` and `?>`
 * boundaries. `run`/`scanPhpDocument` drive that toggle; `scanCode` handles everything inside a PHP region.
 */
class Scanner {
  private i = 0;

  constructor(private readonly content: string) {}

  *run(): Generator<ParsedText> {
    yield* this.scanPhpDocument();
  }

  /**
   * Alternates between HTML markup (everything up to the next `<?php`/`<?=`/`<?`) and a PHP code region
   * (handed to `scanCode` in `phpAware` mode, which returns control here as soon as it sees a top-level
   * `?>`, or otherwise runs to the end of the file).
   */
  private *scanPhpDocument(): Generator<ParsedText> {
    const { content } = this;
    while (this.i < content.length) {
      const tag = findPhpOpenTag(content, this.i);
      const htmlEnd = tag ? tag.tagStart : content.length;
      if (htmlEnd > this.i) {
        const text = content.slice(this.i, htmlEnd);
        yield { text, rawText: text, range: [this.i, htmlEnd], tags: MARKUP_TAG };
      }
      if (!tag) {
        this.i = content.length;
        return;
      }
      this.i = tag.codeStart;
      yield* this.scanCode(true);
    }
  }

  /**
   * Scans PHP code from `this.i` to the end of the file, or until a top-level `?>` drops back to HTML
   * markup mode (leaving `this.i` just past the `?>`). Unlike a JS template literal or a C#-style
   * interpolated string, nothing here ever recurses back into `scanCode` for an interpolation hole - a
   * `"..."` string's or heredoc's `{$...}` hole is skipped over as opaque text by
   * `skipPhpBraceInterpolation`, not parsed as code - so there's no need to track brace depth at this level
   * at all.
   */
  private *scanCode(phpAware: boolean): Generator<ParsedText> {
    const { content } = this;

    while (this.i < content.length) {
      const c = content[this.i];

      if (phpAware && c === '?' && content[this.i + 1] === '>') {
        this.i += 2;
        return;
      }

      if (c === '/' && content[this.i + 1] === '/') {
        const result = this.scanLineComment(phpAware, false);
        yield result.parsedText;
        if (result.closesPhp) return;
        continue;
      }
      // "#[" is a PHP 8 attribute (#[Attribute]), not a comment - only a bare "#" starts a line comment.
      if (c === '#' && content[this.i + 1] !== '[') {
        const result = this.scanLineComment(phpAware, true);
        yield result.parsedText;
        if (result.closesPhp) return;
        continue;
      }
      if (c === '/' && content[this.i + 1] === '*') {
        yield this.scanBlockComment();
        continue;
      }
      if (c === '"' || c === "'") {
        yield this.scanQuotedString(c);
        continue;
      }
      if (content.startsWith('<<<', this.i)) {
        yield* this.scanHeredoc();
        continue;
      }

      this.i++;
    }
  }

  /**
   * A `//` or `#` line comment. Also handles a `?>` appearing mid-comment: PHP's own dialect drops back to
   * HTML mode right there, ending the comment early (without consuming the `?>` as part of its text) -
   * `closesPhp` tells the caller to stop `scanCode` immediately rather than keep looping.
   */
  private scanLineComment(phpAware: boolean, isHash: boolean): { parsedText: ParsedText; closesPhp: boolean } {
    const { content } = this;
    const start = this.i;
    const markerLen = isHash ? 1 : 2;

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
    this.i = closesPhp ? end + 2 : end;
    return { parsedText: { text, rawText, map, range: [start, end], tags: COMMENT_LINE_TAG }, closesPhp };
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

  /**
   * A plain `'...'` string (no interpolation at all) or a `"..."` string (interpolation-aware: a `{$...}`
   * complex-interpolation hole is detected and skipped over as part of the same string, not split into a
   * separate fragment - see `CONTRIBUTING.md` for why).
   */
  private scanQuotedString(quote: string): ParsedText {
    const { content } = this;
    const start = this.i;
    const allowInterpolation = quote === '"';
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
    this.i = end;
    return { text, rawText, map, range: [start, end], tags: tag };
  }

  /**
   * PHP `<<<ID ... ID` heredoc (interpolated, like a double-quoted string - same `{$...}`-skip-not-split
   * behavior) or `<<<'ID' ... ID` nowdoc (literal, like a single-quoted string - no interpolation at all).
   * Unlike a quoted string, the closing marker is matched as a whole line (`ID` at the start of a line, not
   * immediately followed by another identifier character, per PHP's flexible heredoc syntax), so nested
   * quotes/braces in the body never need the same nested-quote handling `scanQuotedString`'s interpolation
   * does.
   */
  private *scanHeredoc(): Generator<ParsedText> {
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
    this.i = markerEnd;
    yield {
      text,
      rawText,
      map,
      range: [start, markerEnd],
      tags: quote === "'" ? STRING_NOWDOC_TAG : STRING_HEREDOC_TAG,
    };
  }
}

/**
 * Parses PHP source and returns only its comments, string/heredoc/nowdoc literals, and the HTML markup
 * surrounding `<?php ... ?>` regions - identifiers, keywords, and punctuation are skipped entirely.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['php']);

const tags: Readonly<ParserTags> = Object.freeze({
  comment: true,
  'comment.line': true,
  'comment.block': true,
  'comment.block.doc': true,
  string: true,
  'string.singleQuote': true,
  'string.doubleQuote': true,
  'string.heredoc': true,
  'string.nowdoc': true,
  markup: true,
});

export const parser: PluginParser = createPluginParser({
  name: 'php-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  /** Parser name to register under. */
  name?: string;
  /** Which tagged segments to keep; omit to keep everything. */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for PHP files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-php-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'php-code-only',
 *   tags: { '*': false, string: true, comment: true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'php', parser: 'php-code-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
