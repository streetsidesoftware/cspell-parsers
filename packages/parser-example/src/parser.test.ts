import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { createParser, parse, parser } from './parser.ts';

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
      expect(comment?.text).toBe('running total');
      expect(comment?.rawText).toBe('// running total');
      expect(comment?.map).toEqual([3, 0]);
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(comment?.range).toEqual([content.indexOf('//'), content.indexOf('//') + '// running total'.length]);
    });

    it('extracts a single-line block comment and tags it', () => {
      expect(parsedTexts[1]?.text).toBe('approximate');
      expect(parsedTexts[1]?.rawText).toBe('/* approximate */');
      expect(parsedTexts[1]?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('extracts a multi-line block comment, stripping the "*" gutter from each line', () => {
      expect(parsedTexts[2]?.text).toBe('\nAdds two numbers together.\n');
      expect(parsedTexts[2]?.rawText).toBe('/*\n * Adds two numbers together.\n */');
      expect(parsedTexts[2]?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('extracts multiple comments, each with its own range', () => {
      const lineComments = parsedTexts.filter((p) => p.tags?.['comment.line']);
      expect(lineComments.map((c) => c.text)).toEqual(['running total', 'first', 'second']);

      const second = lineComments[2];
      expect(second?.range).toEqual([content.indexOf('// second'), content.indexOf('// second') + '// second'.length]);
    });
  });

  describe('strings.c', () => {
    const parsedTexts = parseFixture('strings.c');

    it('does not mistake "//" or "/*" inside a string literal for a comment', () => {
      expect(parsedTexts).toHaveLength(1);
      expect(parsedTexts[0]?.text).toBe('a real comment');
    });

    it('treats an escaped quote as staying inside the string', () => {
      expect(parsedTexts.some((p) => p.text.includes('still inside the string'))).toBe(false);
    });

    it('leaves string literals in the code segments', () => {
      const raw = [...parse(readFixture('strings.c'), 'fixtures/strings.c').parsedTexts];
      const code = raw.filter((p) => p.tags?.code);
      expect(code.some((p) => p.text.includes('"https://example.com"'))).toBe(true);
    });
  });

  it('extends an unterminated block comment to the end of the file', () => {
    const content = readFixture('unterminated.c');
    const [comment] = parseFixture('unterminated.c');

    expect(comment?.text).toBe('never closed');
    expect(comment?.rawText).toBe('/* never closed');
    expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    expect(comment?.range).toEqual([content.indexOf('/*'), content.length]);
  });

  it('returns no parsed text when there are no comments', () => {
    expect(parseFixture('no-comments.c')).toEqual([]);
  });

  it('tags the code between segments (identifiers, keywords, punctuation) as code', () => {
    const rawTexts = [...parse(readFixture('comments.c'), 'fixtures/comments.c').parsedTexts];
    const code = rawTexts.filter((p) => p.tags?.code);
    expect(code.some((p) => p.text.includes('function add(a, b)'))).toBe(true);
    expect(code.every((p) => p.tags?.code === true)).toBe(true);
  });

  it('parser.parse wraps the raw parse export, filtering out code by default', () => {
    const content = '// a comment\nint total = 0;\n';
    const raw = [...parse(content, 'file.c').parsedTexts];
    const filtered = [...parser.parse(content, 'file.c').parsedTexts];

    expect(raw.some((p) => p.tags?.code)).toBe(true);
    expect(filtered).toEqual(raw.filter((p) => !p.tags?.code));
  });

  describe('tags', () => {
    it('declares every tag the Scanner actually emits, across every fixture', () => {
      // A tag emitted but missing from `parser.tags` can't be filtered via `createParser`/`customizePlugin`.
      const emittedTags = new Set<string>();
      for (const fixture of readdirSync(fixturesDir)) {
        for (const p of parse(readFixture(fixture), `fixtures/${fixture}`).parsedTexts) {
          for (const tag in p.tags) emittedTags.add(tag);
        }
      }

      expect(emittedTags.size).toBeGreaterThan(0);
      for (const tag of emittedTags) {
        expect(parser.tags).toHaveProperty(tag);
      }
    });

    it('is off by default for "code" and on for every other tag', () => {
      const { code, ...rest } = parser.tags;
      expect(code).toBe(false);
      expect(Object.values(rest).every((value) => value === true)).toBe(true);
    });
  });
});

describe('createParser', () => {
  const content = '// a comment\n/* a block */\n';

  it('defaults to the "c-style-comments" name and keeps everything when called with no options', () => {
    const customized = createParser();
    expect(customized.name).toBe('c-style-comments');

    const parsedTexts = [...customized.parse(content, 'file.c').parsedTexts];
    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.text === 'a block')).toBe(true);
  });

  it('overrides the name without filtering when tags is omitted', () => {
    const customized = createParser({ name: 'custom-example' });
    expect(customized.name).toBe('custom-example');

    const parsedTexts = [...customized.parse(content, 'file.c').parsedTexts];
    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.text === 'a block')).toBe(true);
  });

  it('filters segments by tag when tags is given', () => {
    const customized = createParser({ tags: { '*': false, 'comment.line': true } });
    const parsedTexts = [...customized.parse(content, 'file.c').parsedTexts];

    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.text === 'a block')).toBe(false);
  });

  it('combines a name override with tag filtering', () => {
    const customized = createParser({ name: 'custom-example', tags: { '*': false, 'comment.line': true } });
    expect(customized.name).toBe('custom-example');

    const parsedTexts = [...customized.parse(content, 'file.c').parsedTexts];
    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.text === 'a block')).toBe(false);
  });
});
