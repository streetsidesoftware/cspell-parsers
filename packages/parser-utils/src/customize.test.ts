import type { ParsedTags, ParsedText, Parser, Plugin } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { compileValidationTags, customizeParser, customizePlugin } from './customize.js';

function mkText(content: string, tags: ParsedText['tags']): ParsedText {
  return { text: content, range: [0, content.length], tags };
}

function fakeParser(parsedTexts: ParsedText[]): Parser {
  return {
    name: 'fake',
    parse: (content, filename) => ({ content, filename, parsedTexts }),
  };
}

describe('customizeParser', () => {
  it('validates everything by default (no validate keys at all)', () => {
    const parsedTexts = [mkText('a', { comment: true }), mkText('b', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), {});
    expect([...parser.parse('', 'f').parsedTexts]).toEqual(parsedTexts);
  });

  it('"*": false excludes everything not otherwise matched', () => {
    const parsedTexts = [mkText('a', { comment: true }), mkText('b', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), { '*': false });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([]);
  });

  it('an exact tag key overrides the "*" default', () => {
    const parsedTexts = [mkText('a', { string: true }), mkText('b', { comment: true }), mkText('c', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), { '*': false, string: true });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([parsedTexts[0]]);
  });

  it('a broader key matches a more specific tag hierarchically', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const parser = customizeParser(fakeParser([docComment]), { '*': false, comment: true });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('a more specific key overrides a broader key for the same segment', () => {
    const blockComment = mkText('a', { comment: true, 'comment.block': true });
    const docComment = mkText('b', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const validate = { '*': true, 'comment.block': false, 'comment.block.doc': true };
    const parser = customizeParser(fakeParser([blockComment, docComment]), validate);
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('supports trailing wildcard patterns like "comment.block.*"', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const lineComment = mkText('b', { comment: true, 'comment.line': true });
    const validate = { '*': false, 'comment.block.*': true };
    const parser = customizeParser(fakeParser([docComment, lineComment]), validate);
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('supports prefix wildcard patterns like "comment*"', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const identifier = mkText('b', { identifier: true, 'identifier.variable': true });
    const validate = { '*': false, 'comment*': true };
    const parser = customizeParser(fakeParser([docComment, identifier]), validate);
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('ignores tags explicitly set to false when deciding which tags a segment "has"', () => {
    const parsedTexts = [mkText('a', { comment: false })];
    const parser = customizeParser(fakeParser(parsedTexts), { '*': false, comment: true });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([]);
  });

  it('preserves other ParseResult fields', () => {
    const parser = customizeParser(fakeParser([]), {});
    const result = parser.parse('content', 'file.ts');
    expect(result.content).toBe('content');
    expect(result.filename).toBe('file.ts');
  });
});

describe('compileValidationTags', () => {
  const docComment: ParsedTags = { comment: true, 'comment.block': true, 'comment.block.doc': true };
  const lineComment: ParsedTags = { comment: true, 'comment.line': true };
  const identifier: ParsedTags = { identifier: true, 'identifier.variable': true };

  it('returns the default for undefined tags, with no exact/prefix/general rules at all', () => {
    expect(compileValidationTags({})(undefined)).toBe(true);
    expect(compileValidationTags({ '*': false })(undefined)).toBe(false);
  });

  describe('exact-only patterns (no "*" anywhere but the default key)', () => {
    const isValidated = compileValidationTags({ '*': false, 'comment.block.doc': true, comment: true });

    it('matches an own tag exactly', () => {
      expect(isValidated({ 'comment.block.doc': true })).toBe(true);
    });

    it('lets the more specific exact key win over a shorter one on the same segment', () => {
      // "comment" and "comment.block.doc" are both own tags of docComment; "comment.block.doc" is longer
      // (more specific) and should win even though both are exact matches.
      expect(isValidated(docComment)).toBe(true);
      expect(isValidated({ ...docComment, 'comment.block.doc': false })).toBe(true); // still matches "comment"
    });

    it('falls back to the default for a tag with no exact match', () => {
      expect(isValidated(identifier)).toBe(false);
    });

    it('returns the default for an empty/undefined tags object', () => {
      expect(isValidated({})).toBe(false);
      expect(isValidated(undefined)).toBe(false);
    });
  });

  describe('prefix-only patterns (every "*" is a single trailing wildcard)', () => {
    const isValidated = compileValidationTags({ '*': false, 'comment.block.*': true, 'string*': true });

    it('matches via startsWith on the literal prefix', () => {
      expect(isValidated(docComment)).toBe(true);
      expect(isValidated({ string: true })).toBe(true);
      expect(isValidated({ 'string.singleQuote': true })).toBe(true);
    });

    it('does not match a tag that only shares a partial prefix', () => {
      expect(isValidated(lineComment)).toBe(false);
    });

    it('lets the longer (more specific) prefix win when more than one matches', () => {
      const isValidated2 = compileValidationTags({ '*': true, 'comment.*': false, 'comment.block.*': true });
      expect(isValidated2(docComment)).toBe(true);
      expect(isValidated2(lineComment)).toBe(false); // only matches the shorter "comment.*"
    });

    it('lets the more specific rule win even when it is the prefix, not the exact key', () => {
      const isValidated2 = compileValidationTags({ '*': false, 'comment.*': true, comment: false });
      // On lineComment, "comment" (exact, specificity 7) matches the "comment" own tag, but "comment.*"
      // (prefix "comment.", specificity 8) also matches the "comment.line" own tag - and wins, since 8 > 7.
      expect(isValidated2(lineComment)).toBe(true);
    });
  });

  describe('general patterns ("*" in the middle, or more than one "*")', () => {
    it('matches a leading wildcard', () => {
      const isValidated = compileValidationTags({ '*': false, '*.doc': true });
      expect(isValidated(docComment)).toBe(true);
      expect(isValidated(lineComment)).toBe(false);
    });

    it('matches a wildcard in the middle', () => {
      const isValidated = compileValidationTags({ '*': false, 'comment.*.doc': true });
      expect(isValidated(docComment)).toBe(true);
      expect(isValidated(lineComment)).toBe(false);
    });

    it('still applies exact and prefix rules alongside general ones', () => {
      const isValidated = compileValidationTags({
        '*': false,
        '*.doc': true,
        'identifier*': true,
        comment: false,
      });
      expect(isValidated(docComment)).toBe(false); // exact "comment" (specificity 7) beats general "*.doc" (specificity 0)
      expect(isValidated(identifier)).toBe(true); // prefix "identifier*" match
      expect(isValidated(lineComment)).toBe(false); // exact "comment" (specificity 7) matches; "*.doc" never applies
    });
  });
});

describe('customizePlugin', () => {
  it('wraps every parser in the plugin', () => {
    const kept = mkText('a', { string: true });
    const dropped = mkText('b', { comment: true });
    const plugin: Plugin = { parsers: [fakeParser([kept, dropped])] };

    const customized = customizePlugin(plugin, { '*': false, string: true });
    const [parser] = customized.parsers ?? [];
    expect(parser).toBeDefined();
    expect('parse' in (parser as Parser) ? [...(parser as Parser).parse('', 'f').parsedTexts] : undefined).toEqual([
      kept,
    ]);
  });

  it('passes through plugins with no parsers', () => {
    const plugin: Plugin = { name: 'empty' };
    expect(customizePlugin(plugin, {})).toEqual(plugin);
  });
});
