import type { SourceMap } from '@cspell/cspell-types';

export interface CommentText {
  /** The comment's content, with delimiters and per-line "gutter" markers removed. */
  readonly text: string;
  /** Maps an offset in `text` back to an offset in the original comment - see {@link SourceMap}. */
  readonly map: SourceMap;
}

/**
 * Strips the delimiters (and, for a multi-line block comment, the per-line "gutter") from a raw
 * comment's source text, returning the spell-checkable `text` plus a `map` a consumer can hand to
 * cspell (alongside `rawText: rawComment` and the node's `range`) so a spelling issue found in `text`
 * is reported at the right offset in the original source.
 *
 * - `// line comment` -> `text: 'line comment'`, skipping `// ` (or just `//`, if no space follows).
 * - `/* block comment *\/` -> `text: 'block comment'`, skipping the `/* ` / ` *\/` padding the same way.
 * - A multi-line `/**` doc block also strips each continuation line's leading whitespace and a single
 *   `*` (plus one following space), so `text` reads as continuous prose rather than repeating `*`s:
 *   ```
 *   /**
 *    * one
 *    * two
 *    *\/
 *   ```
 *   becomes `text: 'one\ntwo'`.
 *
 * `rawText` is assumed to be exactly what a parser's own grammar recognized as a single comment node
 * - it always starts with `//` or `/*`, but an unterminated block comment that a lenient parser
 * extends to the end of the file (no closing `*\/` at all) is also handled: in that case the content
 * simply runs to the end of `rawText` with no closing delimiter to strip.
 */
export function stripCommentMarkers(rawText: string): CommentText {
  return rawText.startsWith('//') ? stripLineComment(rawText) : stripBlockComment(rawText);
}

function stripLineComment(rawText: string): CommentText {
  let skip = 2; // '//'
  if (rawText[skip] === ' ') skip++;
  return { text: rawText.slice(skip), map: [skip, 0] };
}

/**
 * Length of a leading "gutter" - a run of spaces/tabs, then (if what follows is a `*` that isn't
 * itself the start of the comment's closing `*\/`) that `*` plus one more space right after it.
 * Zero if the line has no `*` gutter marker at all.
 */
function gutterLength(rawText: string, start: number, end: number): number {
  let i = start;
  while (i < end && (rawText[i] === ' ' || rawText[i] === '\t')) i++;
  if (i >= end || rawText[i] !== '*') return 0;
  i++;
  if (i < end && rawText[i] === ' ') i++;
  return i - start;
}

function stripBlockComment(rawText: string): CommentText {
  // "/**" only counts as the (3-char) doc opener when it can't also be reaching into the closing "*/"
  // (e.g. the 4-char comment "/**/" is "/*" + "*/", not a 3-char "/**" open with nothing left to close).
  const openLen = rawText.startsWith('/**') && rawText.length >= 5 ? 3 : 2;
  let openSkip = openLen;
  if (rawText[openSkip] === ' ') openSkip++;

  const hasClosingDelimiter = rawText.length - openSkip >= 2 && rawText.endsWith('*/');
  const closeStart = hasClosingDelimiter ? rawText.length - 2 : rawText.length;
  const map: SourceMap = [openSkip, 0];
  let text = '';
  let pos = openSkip;

  // Each iteration consumes one continuation line - up to and including its trailing newline, plus
  // the next line's leading gutter - stopping once no further newline precedes the closing delimiter.
  for (;;) {
    const newlineIndex = rawText.indexOf('\n', pos);
    if (newlineIndex === -1 || newlineIndex >= closeStart) break;

    if (newlineIndex > pos) {
      map.push(newlineIndex - pos, newlineIndex - pos);
      text += rawText.slice(pos, newlineIndex);
    }
    map.push(1, 1); // the newline itself stays, separating lines in `text`
    text += '\n';
    pos = newlineIndex + 1;

    const gutter = gutterLength(rawText, pos, closeStart);
    if (gutter > 0) {
      map.push(gutter, 0);
      pos += gutter;
    }
  }

  // Final stretch up to the closing delimiter: one padding space directly before it, if present, is
  // delimiter padding rather than content - mirroring the opening delimiter's padding rule. An
  // unterminated comment has no closing delimiter to pad for, or to strip below.
  let contentEnd = closeStart;
  if (hasClosingDelimiter && contentEnd > pos && rawText[contentEnd - 1] === ' ') contentEnd--;
  if (contentEnd > pos) {
    map.push(contentEnd - pos, contentEnd - pos);
    text += rawText.slice(pos, contentEnd);
  }
  if (hasClosingDelimiter) map.push(rawText.length - contentEnd, 0);

  return { text, map };
}
