import type { ParsedTags, ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { compileTagFilter, customizeParser } from './customize.js';
import type { PluginParser } from './types.js';

function mkText(content: string, tags: ParsedText['tags']): ParsedText {
  return { text: content, range: [0, content.length], tags };
}

function fakeParser(parsedTexts: ParsedText[]): PluginParser {
  return {
    name: 'fake',
    parse: (content, filename) => ({ content, filename, parsedTexts }),
    supportedFileTypes: [],
    tags: {},
  };
}

describe('customizeParser', () => {
  it('keeps everything by default (no tag keys at all)', () => {
    const parsedTexts = [mkText('a', { comment: true }), mkText('b', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), { tags: {} });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual(parsedTexts);
  });

  it('"*": false excludes everything not otherwise matched', () => {
    const parsedTexts = [mkText('a', { comment: true }), mkText('b', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), { tags: { '*': false } });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([]);
  });

  it('an exact tag key overrides the "*" default', () => {
    const parsedTexts = [mkText('a', { string: true }), mkText('b', { comment: true }), mkText('c', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), { tags: { '*': false, string: true } });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([parsedTexts[0]]);
  });

  it('a broader key matches a more specific tag hierarchically', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const parser = customizeParser(fakeParser([docComment]), { tags: { '*': false, comment: true } });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('a more specific key overrides a broader key for the same segment', () => {
    const blockComment = mkText('a', { comment: true, 'comment.block': true });
    const docComment = mkText('b', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const tags = { '*': true, 'comment.block': false, 'comment.block.doc': true };
    const parser = customizeParser(fakeParser([blockComment, docComment]), { tags });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('supports trailing wildcard patterns like "comment.block.*"', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const lineComment = mkText('b', { comment: true, 'comment.line': true });
    const tags = { '*': false, 'comment.block.*': true };
    const parser = customizeParser(fakeParser([docComment, lineComment]), { tags });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('supports prefix wildcard patterns like "comment*"', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const identifier = mkText('b', { identifier: true, 'identifier.variable': true });
    const tags = { '*': false, 'comment*': true };
    const parser = customizeParser(fakeParser([docComment, identifier]), { tags });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('ignores tags explicitly set to false when deciding which tags a segment "has"', () => {
    const parsedTexts = [mkText('a', { comment: false })];
    const parser = customizeParser(fakeParser(parsedTexts), { tags: { '*': false, comment: true } });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([]);
  });

  it('preserves other ParseResult fields', () => {
    const parser = customizeParser(fakeParser([]), { tags: {} });
    const result = parser.parse('content', 'file.ts');
    expect(result.content).toBe('content');
    expect(result.filename).toBe('file.ts');
  });

  it('keeps the original name when options.name is not given', () => {
    const parser = customizeParser(fakeParser([]), { tags: {} });
    expect(parser.name).toBe('fake');
  });

  it('overrides the name when options.name is given', () => {
    const parser = customizeParser(fakeParser([]), { name: 'custom', tags: {} });
    expect(parser.name).toBe('custom');
  });
});

describe('compileTagFilter', () => {
  const docComment: ParsedTags = { comment: true, 'comment.block': true, 'comment.block.doc': true };
  const lineComment: ParsedTags = { comment: true, 'comment.line': true };
  const identifier: ParsedTags = { identifier: true, 'identifier.variable': true };

  it('returns the default for undefined tags, with no exact/prefix/general rules at all', () => {
    expect(compileTagFilter({})(undefined)).toBe(true);
    expect(compileTagFilter({ '*': false })(undefined)).toBe(false);
  });

  it('treats an explicit `undefined` value the same as the key being absent', () => {
    expect(compileTagFilter({ '*': false, comment: undefined })(docComment)).toBe(false);
    expect(compileTagFilter({ '*': false, comment: true, 'comment.block': undefined })(docComment)).toBe(true);
    expect(compileTagFilter({ '*': false, 'comment*': undefined })(docComment)).toBe(false);
    expect(compileTagFilter({ '*': false, '*.doc': undefined })(docComment)).toBe(false);
    expect(compileTagFilter({ '*': true, '*.doc': undefined })(docComment)).toBe(true);
  });

  describe('exact-only patterns (no "*" anywhere but the default key)', () => {
    const isIncluded = compileTagFilter({ '*': false, 'comment.block.doc': true, comment: true });

    it('matches an own tag exactly', () => {
      expect(isIncluded({ 'comment.block.doc': true })).toBe(true);
    });

    it('lets the more specific exact key win over a shorter one on the same segment', () => {
      // "comment" and "comment.block.doc" are both own tags of docComment; "comment.block.doc" is longer
      // (more specific) and should win even though both are exact matches.
      expect(isIncluded(docComment)).toBe(true);
      expect(isIncluded({ ...docComment, 'comment.block.doc': false })).toBe(true); // still matches "comment"
    });

    it('falls back to the default for a tag with no exact match', () => {
      expect(isIncluded(identifier)).toBe(false);
    });

    it('returns the default for an empty/undefined tags object', () => {
      expect(isIncluded({})).toBe(false);
      expect(isIncluded(undefined)).toBe(false);
    });
  });

  describe('prefix-only patterns (every "*" is a single trailing wildcard)', () => {
    const isIncluded = compileTagFilter({ '*': false, 'comment.block.*': true, 'string*': true });

    it('matches via startsWith on the literal prefix', () => {
      expect(isIncluded(docComment)).toBe(true);
      expect(isIncluded({ string: true })).toBe(true);
      expect(isIncluded({ 'string.singleQuote': true })).toBe(true);
    });

    it('does not match a tag that only shares a partial prefix', () => {
      expect(isIncluded(lineComment)).toBe(false);
    });

    it('lets the longer (more specific) prefix win when more than one matches', () => {
      const isIncluded2 = compileTagFilter({ '*': true, 'comment.*': false, 'comment.block.*': true });
      expect(isIncluded2(docComment)).toBe(true);
      expect(isIncluded2(lineComment)).toBe(false); // only matches the shorter "comment.*"
    });

    it('lets the more specific rule win even when it is the prefix, not the exact key', () => {
      const isIncluded2 = compileTagFilter({ '*': false, 'comment.*': true, comment: false });
      // On lineComment, "comment" (exact, specificity 7) matches the "comment" own tag, but "comment.*"
      // (prefix "comment.", specificity 8) also matches the "comment.line" own tag - and wins, since 8 > 7.
      expect(isIncluded2(lineComment)).toBe(true);
    });
  });

  describe('general patterns ("*" in the middle, or more than one "*")', () => {
    it('matches a leading wildcard', () => {
      const isIncluded = compileTagFilter({ '*': false, '*.doc': true });
      expect(isIncluded(docComment)).toBe(true);
      expect(isIncluded(lineComment)).toBe(false);
    });

    it('matches a wildcard in the middle', () => {
      const isIncluded = compileTagFilter({ '*': false, 'comment.*.doc': true });
      expect(isIncluded(docComment)).toBe(true);
      expect(isIncluded(lineComment)).toBe(false);
    });

    it('still applies exact and prefix rules alongside general ones', () => {
      const isIncluded = compileTagFilter({
        '*': false,
        '*.doc': true,
        'identifier*': true,
        comment: false,
      });
      expect(isIncluded(docComment)).toBe(false); // exact "comment" (specificity 7) beats general "*.doc" (specificity 0)
      expect(isIncluded(identifier)).toBe(true); // prefix "identifier*" match
      expect(isIncluded(lineComment)).toBe(false); // exact "comment" (specificity 7) matches; "*.doc" never applies
    });
  });
});
