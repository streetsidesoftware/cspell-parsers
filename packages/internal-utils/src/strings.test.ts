import { describe, expect, it } from 'vitest';

import type { StringPart } from './strings.ts';
import { decodeStringParts } from './strings.ts';

/**
 * Checks a map's `(srcLen, dstLen)` pairs are internally consistent with `parts` and the text they
 * decoded to: source lengths must sum to the raw parts' total length, and destination lengths must sum
 * to `text.length` - unlike the comment map (which only ever skips or copies verbatim), a real escape
 * decode's dest content (e.g. `é` for `\u00e9`) isn't a substring of the source, so it can't be
 * reconstructed from raw text the way `applyMap` does in comments.test.ts.
 */
function mapIsConsistent(parts: readonly StringPart[], text: string, map: readonly number[]): boolean {
  const rawLength = parts.reduce((sum, p) => sum + p.text.length, 0);
  let srcTotal = 0;
  let dstTotal = 0;
  for (let i = 0; i < map.length; i += 2) {
    srcTotal += map[i] ?? 0;
    dstTotal += map[i + 1] ?? 0;
  }
  return srcTotal === rawLength && dstTotal === text.length;
}

function frag(text: string): StringPart {
  return { text, isEscape: false };
}

function esc(text: string): StringPart {
  return { text, isEscape: true };
}

describe('decodeStringParts', () => {
  it('passes literal fragments through untouched', () => {
    expect(decodeStringParts([frag('hello')])).toEqual({ text: 'hello', map: [5, 5] });
  });

  it('decodes single-character escapes', () => {
    const cases: [string, string][] = [
      ['\\n', '\n'],
      ['\\t', '\t'],
      ['\\r', '\r'],
      ['\\b', '\b'],
      ['\\f', '\f'],
      ['\\v', '\v'],
      ['\\0', '\0'],
      ['\\\\', '\\'],
      ["\\'", "'"],
      ['\\"', '"'],
      ['\\`', '`'],
      ['\\$', '$'],
    ];
    for (const [raw, decoded] of cases) {
      expect(decodeStringParts([esc(raw)])).toEqual({ text: decoded, map: [raw.length, decoded.length] });
    }
  });

  it('decodes a \\xHH hex escape', () => {
    expect(decodeStringParts([esc('\\x41')])).toEqual({ text: 'A', map: [4, 1] });
  });

  it('decodes a \\uHHHH unicode escape', () => {
    expect(decodeStringParts([esc('\\u00e9')])).toEqual({ text: 'é', map: [6, 1] });
  });

  it('decodes a \\u{...} code point escape, including astral code points', () => {
    expect(decodeStringParts([esc('\\u{1F600}')])).toEqual({ text: '😀', map: [9, 2] });
  });

  it('splices out a line-continuation escape (backslash + real newline) entirely', () => {
    expect(decodeStringParts([esc('\\\n')])).toEqual({ text: '', map: [2, 0] });
  });

  it('falls back to dropping just the backslash for an unrecognized escape', () => {
    expect(decodeStringParts([esc('\\q')])).toEqual({ text: 'q', map: [2, 1] });
  });

  it('falls back to dropping just the backslash for a \\u{...} code point past U+10FFFF', () => {
    expect(decodeStringParts([esc('\\u{110000}')])).toEqual({ text: 'u{110000}', map: [10, 9] });
  });

  it('leaves a legacy multi-digit octal escape as its literal digits, not its numeric value', () => {
    expect(decodeStringParts([esc('\\12')])).toEqual({ text: '12', map: [3, 2] });
  });

  it('reproduces the café example from the SourceMap doc comment', () => {
    // "Grand Caf\u00e9" -> "Grand Café"
    const parts = [frag('Grand Caf'), esc('\\u00e9')];
    expect(decodeStringParts(parts)).toEqual({ text: 'Grand Café', map: [9, 9, 6, 1] });
  });

  it('handles a mix of fragments and multiple escapes, with a self-consistent map', () => {
    const parts = [frag('caf'), esc('\\u00e9'), frag(' au '), esc('\\n'), frag(' lait')];
    const result = decodeStringParts(parts);
    expect(result.text).toBe('café au \n lait');
    expect(mapIsConsistent(parts, result.text, result.map)).toBe(true);
  });

  it('returns empty text and an empty map for no parts', () => {
    expect(decodeStringParts([])).toEqual({ text: '', map: [] });
  });
});
