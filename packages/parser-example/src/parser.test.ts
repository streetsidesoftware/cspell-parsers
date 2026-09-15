import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parser } from './parser.js';

const fixturesDir = join(import.meta.dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

function parseFixture(name: string): ParsedText[] {
  const content = readFixture(name);
  return [...parser.parse(content, `fixtures/${name}`).parsedTexts];
}

describe('c-style-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('comments.c');
    const result = parser.parse(content, 'fixtures/comments.c');

    expect(result.filename).toBe('fixtures/comments.c');
    expect(result.content).toBe(content);
  });

  describe('comments.c', () => {
    const content = readFixture('comments.c');
    const parsedTexts = parseFixture('comments.c');

    it('extracts a line comment and tags it', () => {
      const comment = parsedTexts[0];
      expect(comment?.text).toBe('// running total');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(comment?.range).toEqual([content.indexOf('//'), content.indexOf('//') + '// running total'.length]);
    });

    it('extracts a single-line block comment and tags it', () => {
      expect(parsedTexts[1]?.text).toBe('/* approximate */');
      expect(parsedTexts[1]?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('extracts a multi-line block comment', () => {
      expect(parsedTexts[2]?.text).toBe('/*\n * Adds two numbers together.\n */');
      expect(parsedTexts[2]?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('extracts multiple comments, each with its own range', () => {
      const lineComments = parsedTexts.filter((p) => p.tags?.['comment.line']);
      expect(lineComments.map((c) => c.text)).toEqual(['// running total', '// first', '// second']);

      const second = lineComments[2];
      expect(second?.range).toEqual([content.indexOf('// second'), content.indexOf('// second') + '// second'.length]);
    });
  });

  describe('strings.c', () => {
    const parsedTexts = parseFixture('strings.c');

    it('does not mistake "//" inside a string literal for a line comment', () => {
      expect(parsedTexts).toHaveLength(1);
      expect(parsedTexts[0]?.text).toBe('// a real comment');
    });

    it('does not mistake "/*" inside a string literal for a block comment', () => {
      expect(parsedTexts.some((p) => p.text.includes('not a comment'))).toBe(false);
    });

    it('treats an escaped quote as staying inside the string', () => {
      expect(parsedTexts.some((p) => p.text.includes('still inside the string'))).toBe(false);
    });
  });

  it('extends an unterminated block comment to the end of the file', () => {
    const content = readFixture('unterminated.c');
    const [comment] = parseFixture('unterminated.c');

    expect(comment?.text).toBe('/* never closed');
    expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    expect(comment?.range).toEqual([content.indexOf('/*'), content.length]);
  });

  it('returns no parsed text when there are no comments', () => {
    expect(parseFixture('no-comments.c')).toEqual([]);
  });
});
