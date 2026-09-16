import { describe, expect, it } from 'vitest';

import { stripCommentMarkers } from './comments.js';

/**
 * Reconstructs the transformed text implied by `map` (see the `SourceMap` doc comment in
 * `@cspell/cspell-types`) by walking its `(srcLen, dstLen)` pairs over `rawText`, so tests can check
 * the map is actually consistent with `text` rather than just eyeballing both values separately.
 */
function applyMap(rawText: string, map: readonly number[]): string {
  let out = '';
  let pos = 0;
  for (let i = 0; i < map.length; i += 2) {
    const srcLen = map[i] ?? 0;
    const dstLen = map[i + 1] ?? 0;
    out += dstLen === srcLen ? rawText.slice(pos, pos + srcLen) : '�'.repeat(dstLen);
    pos += srcLen;
  }
  out += rawText.slice(pos); // trailing 1:1 span, implied by the map format
  return out;
}

describe('stripCommentMarkers', () => {
  describe('line comments', () => {
    it('strips "// " (marker plus one space)', () => {
      expect(stripCommentMarkers('// one line')).toEqual({ text: 'one line', map: [3, 0] });
    });

    it('strips "//" alone when no space follows', () => {
      expect(stripCommentMarkers('//one line')).toEqual({ text: 'one line', map: [2, 0] });
    });

    it('only strips a single leading space, not all of them', () => {
      expect(stripCommentMarkers('//   indented')).toEqual({ text: '  indented', map: [3, 0] });
    });

    it('handles an empty line comment', () => {
      expect(stripCommentMarkers('//')).toEqual({ text: '', map: [2, 0] });
    });

    it('is consistent with applying its own map', () => {
      const raw = '// one line';
      const { text, map } = stripCommentMarkers(raw);
      expect(applyMap(raw, map)).toBe(text);
    });
  });

  describe('single-line block comments', () => {
    it('strips "/* " and " */"', () => {
      expect(stripCommentMarkers('/* text */')).toEqual({ text: 'text', map: [3, 0, 4, 4, 3, 0] });
    });

    it('strips "/*" and "*/" with no padding space', () => {
      expect(stripCommentMarkers('/*text*/')).toEqual({ text: 'text', map: [2, 0, 4, 4, 2, 0] });
    });

    it('strips "/** " and " */" for a single-line doc comment', () => {
      expect(stripCommentMarkers('/** hi */')).toEqual({ text: 'hi', map: [4, 0, 2, 2, 3, 0] });
    });

    it('handles an empty block comment', () => {
      expect(stripCommentMarkers('/**/')).toEqual({ text: '', map: [2, 0, 2, 0] });
    });

    it('handles an empty doc comment', () => {
      expect(stripCommentMarkers('/***/')).toEqual({ text: '', map: [3, 0, 2, 0] });
    });

    it('is consistent with applying its own map', () => {
      const raw = '/** hi */';
      const { text, map } = stripCommentMarkers(raw);
      expect(applyMap(raw, map)).toBe(text);
    });
  });

  describe('multi-line doc comments', () => {
    const raw = ['/**', ' * one', ' * two', ' */'].join('\n');

    it('strips the open/close delimiters and each line\'s "* " gutter', () => {
      const { text } = stripCommentMarkers(raw);
      expect(text).toBe('\none\ntwo\n');
    });

    it('produces a map consistent with the text it returns', () => {
      const { text, map } = stripCommentMarkers(raw);
      expect(applyMap(raw, map)).toBe(text);
    });

    it('leaves a gutter-less continuation line untouched', () => {
      const looseRaw = ['/**', 'one', 'two', '*/'].join('\n');
      const { text, map } = stripCommentMarkers(looseRaw);
      expect(text).toBe('\none\ntwo\n');
      expect(applyMap(looseRaw, map)).toBe(text);
    });

    it('collapses a blank gutter-only line to just its separating newline', () => {
      const withBlank = ['/**', ' * one', ' *', ' * two', ' */'].join('\n');
      const { text, map } = stripCommentMarkers(withBlank);
      expect(text).toBe('\none\n\ntwo\n');
      expect(applyMap(withBlank, map)).toBe(text);
    });

    it('handles content that runs right up against the closing delimiter on its own line', () => {
      const raw2 = ['/**', ' * one */'].join('\n');
      const { text, map } = stripCommentMarkers(raw2);
      expect(text).toBe('\none');
      expect(applyMap(raw2, map)).toBe(text);
    });
  });

  describe('unterminated block comments (no closing "*/" at all)', () => {
    it('does not mistake trailing content for a closing delimiter', () => {
      const raw = '/* never closed';
      const { text, map } = stripCommentMarkers(raw);
      expect(text).toBe('never closed');
      expect(map).toEqual([3, 0, 12, 12]);
      expect(applyMap(raw, map)).toBe(text);
    });

    it('handles an unterminated comment that is only the opening delimiter', () => {
      expect(stripCommentMarkers('/*')).toEqual({ text: '', map: [2, 0] });
    });

    it('still strips per-line gutters across multiple unterminated lines', () => {
      const raw = ['/**', ' * one', ' * two'].join('\n');
      const { text, map } = stripCommentMarkers(raw);
      expect(text).toBe('\none\ntwo');
      expect(applyMap(raw, map)).toBe(text);
    });
  });
});
