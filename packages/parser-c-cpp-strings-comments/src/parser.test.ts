import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { createParser, parse, parser } from './parser.js';

const fixturesDir = join(import.meta.dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

function parseFixture(name: string): ParsedText[] {
  const content = readFixture(name);
  return [...parser.parse(content, `fixtures/${name}`).parsedTexts];
}

function byText(parsedTexts: ParsedText[], text: string): ParsedText | undefined {
  return parsedTexts.find((p) => p.text === text);
}

describe('c-cpp-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('comments-and-strings.c');
    const result = parser.parse(content, 'fixtures/comments-and-strings.c');

    expect(result.filename).toBe('fixtures/comments-and-strings.c');
    expect(result.content).toBe(content);
  });

  describe('comments-and-strings.c', () => {
    const content = readFixture('comments-and-strings.c');
    const parsedTexts = parseFixture('comments-and-strings.c');

    it('extracts a line comment and tags it', () => {
      const comment = parsedTexts[0];
      expect(comment?.text).toBe('running total');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(comment?.range).toEqual([content.indexOf('//'), content.indexOf('//') + '// running total'.length]);
    });

    it('extracts a single-line block comment and tags it', () => {
      const comment = byText(parsedTexts, 'approximate');
      expect(comment?.rawText).toBe('/* approximate */');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('tags a /** */ comment as a doc comment, stripping the "*" gutter', () => {
      const comment = byText(parsedTexts, '\nAdds two numbers together.\n');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true, 'comment.block.doc': true });
    });

    it('extracts a double-quoted string', () => {
      const str = byText(parsedTexts, 'see http://example.com');
      expect(str?.rawText).toBe('"see http://example.com"');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('does not split the fake "/* nope */" inside a real line comment into its own segment', () => {
      expect(byText(parsedTexts, 'nope')).toBeUndefined();
    });

    it('keeps the rest of a line comment even when it contains quote characters', () => {
      const comment = byText(parsedTexts, 'not a real comment: "/* nope */"');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a single-quoted char literal as string.singleQuote', () => {
      const str = byText(parsedTexts, 'A');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('treats a backslash-escaped quote as staying inside the string', () => {
      const str = byText(parsedTexts, 'she said \\"hi\\" then left');
      expect(str).toBeDefined();
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

  describe('raw-strings.cpp', () => {
    // tryScanCppRawString's delimiter matching is the trickiest part of this parser: it must find the exact
    // ")delim\"" closer, not just the next occurrence of ")" or "\"" - this fixture exercises a delimiter
    // containing a substring (")DEL") that looks almost, but not quite, like the real closer (")DELIM").
    const parsedTexts = parseFixture('raw-strings.cpp');

    it('extracts a plain R"(...)" raw string without treating its contents as escapes/comments', () => {
      const str = byText(parsedTexts, 'C:\\path\\to\\file "quoted" // not a comment');
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('honors a custom delimiter, matching only ")DELIM\\"" as the close - not the near-miss ")DEL"', () => {
      const str = byText(parsedTexts, "has a ) paren and even )DEL which isn't quite the closer");
      expect(str).toBeDefined();
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('extracts a second raw string after the first one closes', () => {
      expect(byText(parsedTexts, 'second raw string')).toBeDefined();
    });

    it('does not treat "notRaw" as an R"..." prefix', () => {
      expect(parsedTexts.some((p) => p.text.includes('notRaw'))).toBe(false);
    });

    it('recognizes the u/U/L/u8 encoding prefixes on a raw string', () => {
      const str = byText(parsedTexts, "has a ) paren and even )DEL which isn't quite the closer");
      expect(str?.rawText?.startsWith('uR"DELIM(')).toBe(true);
    });
  });

  it('extends an unterminated raw string to the end of the file when its closing delimiter is never found', () => {
    const content = readFixture('unterminated-raw-string.cpp');
    const parsedTexts = parseFixture('unterminated-raw-string.cpp');
    const str = byText(parsedTexts, 'this raw string never finds its closer');

    expect(str).toBeDefined();
    expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    expect(str?.range).toEqual([content.indexOf('R"'), content.length]);
  });

  describe('header.hpp', () => {
    // A header file has no special handling of its own (this parser doesn't dialect-detect by extension at
    // all), but it's a realistic file to run the full scanner over end-to-end: a line comment, a block doc
    // comment, and no strings at all.
    const parsedTexts = parseFixture('header.hpp');

    it('extracts a line comment', () => {
      expect(byText(parsedTexts, 'Represents a rectangle with a width and a height.')?.tags).toEqual({
        comment: true,
        'comment.line': true,
      });
    });

    it('tags the /** */ comment as a doc comment', () => {
      const comment = byText(parsedTexts, '\nComputes the area of the rectangle.\n');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true, 'comment.block.doc': true });
    });
  });

  describe('Doxygen line-doc comments ("///" and "//!")', () => {
    it('tags a "///" line as comment.line.doc', () => {
      const content = '/// a doc comment\n';
      const parsed = [...parse(content, 'file.c').parsedTexts];
      expect(byText(parsed, 'a doc comment')?.tags).toEqual({
        comment: true,
        'comment.line': true,
        'comment.line.doc': true,
      });
    });

    it('tags a "//!" line as comment.line.doc', () => {
      const content = '//! a doc comment\n';
      const parsed = [...parse(content, 'file.c').parsedTexts];
      expect(byText(parsed, 'a doc comment')?.tags).toEqual({
        comment: true,
        'comment.line': true,
        'comment.line.doc': true,
      });
    });

    it('does not tag a "////" separator line (four-or-more slashes) as a doc comment', () => {
      const content = '//// a plain separator, not a doc comment\n';
      const parsed = [...parse(content, 'file.c').parsedTexts];
      const line = parsed[0];
      expect(line?.text.startsWith('//')).toBe(true);
      expect(line?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a plain "//" comment as comment.line, not comment.line.doc', () => {
      const content = '// a plain comment\n';
      const parsed = [...parse(content, 'file.c').parsedTexts];
      expect(byText(parsed, 'a plain comment')?.tags).toEqual({ comment: true, 'comment.line': true });
    });
  });

  describe('unterminated literals ending in a trailing lone backslash', () => {
    // Regression coverage for a Copilot review finding on @cspell/parser-strings-comments PR #60: an
    // escape-skip that blindly advances two characters (`i += 2`) can land past `content.length` when the
    // backslash it's skipping is the very last character in the file, producing a `range`/`map` that doesn't
    // match `rawText`'s actual length.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText?.length);
    }

    it('a plain double-quoted string', () => {
      const content = 'const char *s = "abc\\';
      const [str] = [...parse(content, 'file.c').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });

    it('a plain single-quoted char literal', () => {
      const content = "char c = 'a\\";
      const [str] = [...parse(content, 'file.c').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });
  });

  describe('createParser', () => {
    const content = '// a comment\n"a string"\n';

    it('defaults to the "c-cpp-strings-comments" name and keeps everything when called with no options', () => {
      const customized = createParser();
      expect(customized.name).toBe('c-cpp-strings-comments');

      const parsedTexts = [...customized.parse(content, 'file.c').parsedTexts];
      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(true);
    });

    it('filters segments by tag when tags is given', () => {
      const customized = createParser({ tags: { '*': false, comment: true } });
      const parsedTexts = [...customized.parse(content, 'file.c').parsedTexts];

      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(false);
    });
  });

  describe('parse (named export used directly by the Parser)', () => {
    it('is the same function wired into the exported parser', () => {
      expect(parser.parse).toBe(parse);
    });
  });
});
