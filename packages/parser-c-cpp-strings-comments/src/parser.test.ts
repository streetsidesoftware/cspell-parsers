import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parse, parser } from './parser.ts';

const fixturesDir = join(import.meta.dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

function parseFixture(name: string, parseFn = parser.parse): ParsedText[] {
  const content = readFixture(name);
  return [...parseFn(content, `fixtures/${name}`).parsedTexts];
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

    it('tags the unhandled C/C++ code between segments (identifiers, keywords, punctuation) as code', () => {
      const rawTexts = parseFixture('comments-and-strings.c', parse);
      const code = rawTexts.filter((p) => p.tags?.code);
      expect(code.length).toBeGreaterThan(0);
      expect(code.every((p) => p.tags?.code === true)).toBe(true);
      // "int total" is ordinary C code, not a comment/string segment, so it should surface via `code`.
      expect(code.some((p) => p.text.includes('int total'))).toBe(true);
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

  describe('digit-separators.cpp', () => {
    const parsedTexts = parseFixture('digit-separators.cpp');
    const strings = parsedTexts.filter((p) => p.tags?.string).map((p) => p.text);

    it("does not read a digit separator (1'000'000, 0xFF'FF, 3.141'592) as a char literal", () => {
      expect(strings).toEqual(["\\'", 'w', 'a real string after the numbers']);
    });

    it("still reads a prefixed char literal (u'w') as a char literal", () => {
      expect(byText(parsedTexts, 'w')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('digit separators vs. char literals (inline)', () => {
    const stringsIn = (content: string) =>
      [...parse(content, 'file.cpp').parsedTexts].filter((p) => p.tags?.string).map((p) => p.rawText);

    it.each(["1'000'000", "0xFF'FF", ".5'5", "1.5e+1'0", "0x1.8p1'0", "1'000_km"])('reads %s as a number', (num) => {
      expect(stringsIn(`x = ${num};\n`)).toEqual([]);
    });

    it.each([
      ["x1'a'", ["'a'"]],
      ["obj.a1'b'", ["'b'"]],
      ["u8'x'", ["'x'"]],
      ["L'y'", ["'y'"]],
      ["U'z'", ["'z'"]],
      ["'1''a'", ["'1'", "'a'"]],
      ["1' '", ["' '"]],
    ])('still opens a char literal in %s', (code, expected) => {
      expect(stringsIn(`x = ${code};\n`)).toEqual(expected);
    });

    it("starts a new token after a char literal, so 1'2 in 'a'1'2 is a number", () => {
      expect(stringsIn("x = 'a'1'2;\n")).toEqual(["'a'"]);
    });

    it('scans a long run of digit separators in linear time', () => {
      const content = `x = ${"1'".repeat(100_000)}1; // the end\n`;
      const start = performance.now();
      const parsedTexts = [...parse(content, 'file.cpp').parsedTexts];
      expect(performance.now() - start).toBeLessThan(1000);
      expect(parsedTexts.some((p) => p.text === 'the end')).toBe(true);
    });
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
      const parsedTexts = [...parse(content, 'file.c').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
    });

    it('a plain single-quoted char literal', () => {
      const content = "char c = 'a\\";
      const parsedTexts = [...parse(content, 'file.c').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
    });
  });

  describe('parse (named export used directly by the Parser)', () => {
    it('parser.parse wraps the raw parse export, filtering out code by default', () => {
      const content = '// a comment\nint total = 0;\n"a string"\n';
      const raw = [...parse(content, 'file.c').parsedTexts];
      const filtered = [...parser.parse(content, 'file.c').parsedTexts];

      expect(raw.some((p) => p.tags?.code)).toBe(true);
      expect(filtered.some((p) => p.tags?.code)).toBe(false);
      expect(filtered).toEqual(raw.filter((p) => !p.tags?.code));
    });
  });

  describe('tags', () => {
    it('declares every tag the Scanner actually emits, across every fixture', () => {
      // Regression coverage for a tag silently becoming impossible to filter: a tag filter only
      // knows about tags listed in `parser.tags`, so a tag the Scanner emits but `tags` doesn't declare
      // would never be reachable via `customizePlugin`'s `tags` option, with no error to
      // catch the mistake.
      const emittedTags = new Set<string>();
      for (const fixture of readdirSync(fixturesDir)) {
        for (const p of parseFixture(fixture, parse)) {
          for (const tag in p.tags) emittedTags.add(tag);
        }
      }

      expect(emittedTags.size).toBeGreaterThan(0); // sanity check the fixtures actually exercised something
      for (const tag of emittedTags) {
        expect(parser.tags).toHaveProperty(tag);
      }
    });

    it('is off by default for "code", the one tag a consumer has to opt into', () => {
      expect(parser.tags.code).toBe(false);
    });

    it('is on by default for every other declared tag', () => {
      const { code: _code, ...rest } = parser.tags;
      expect(Object.values(rest).every((value) => value === true)).toBe(true);
    });
  });
});
