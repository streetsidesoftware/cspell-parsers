import { readdirSync, readFileSync } from 'node:fs';
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

describe('go-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('comments-and-strings.go');
    const result = parser.parse(content, 'fixtures/comments-and-strings.go');

    expect(result.filename).toBe('fixtures/comments-and-strings.go');
    expect(result.content).toBe(content);
  });

  describe('comments-and-strings.go', () => {
    const content = readFixture('comments-and-strings.go');
    const parsedTexts = parseFixture('comments-and-strings.go');

    it('extracts a line comment and tags it', () => {
      const comment = parsedTexts[0];
      expect(comment?.text).toBe('Package greeting builds friendly messages for the CLI.');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(comment?.range).toEqual([content.indexOf('//'), content.indexOf('\n', content.indexOf('//'))]);
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

    it('extracts a double-quoted interpreted string', () => {
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

    it('tags a single-quoted rune literal as string.singleQuote', () => {
      const str = byText(parsedTexts, '\\n');
      expect(str?.rawText).toBe("'\\n'");
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('tags a plain single-character rune literal as string.singleQuote', () => {
      const str = byText(parsedTexts, 'A');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('treats a backslash-escaped quote as staying inside the string', () => {
      const str = byText(parsedTexts, 'she said \\"hi\\" then left');
      expect(str).toBeDefined();
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('extracts a backtick raw string and tags it string.raw', () => {
      const str = byText(parsedTexts, 'C:\\path\\to\\file "quoted" // not a comment');
      expect(str?.rawText).toBe('`C:\\path\\to\\file "quoted" // not a comment`');
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('does not treat a quote or "//" inside a raw string as a real string boundary or comment', () => {
      // If the raw string weren't recognized as one opaque unit, the '"quoted"' inside it would show up as
      // its own separate segment, or the "//" would be (mis)read as starting a line comment.
      expect(byText(parsedTexts, 'quoted')).toBeUndefined();
      expect(byText(parsedTexts, ' not a comment')).toBeUndefined();
    });
  });

  it('extends an unterminated block comment to the end of the file', () => {
    const content = readFixture('unterminated.go');
    const [comment] = parseFixture('unterminated.go');

    expect(comment?.text).toBe('never closed');
    expect(comment?.rawText).toBe('/* never closed');
    expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    expect(comment?.range).toEqual([content.indexOf('/*'), content.length]);
  });

  it('extends an unterminated interpreted string to the end of the file', () => {
    const content = readFixture('unterminated-string.go');
    const parsedTexts = parseFixture('unterminated-string.go');
    const str = byText(parsedTexts, 'never closed');

    expect(str?.rawText).toBe('"never closed');
    expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    expect(str?.range).toEqual([content.indexOf('"'), content.length]);
  });

  it('extends an unterminated raw string to the end of the file', () => {
    const content = readFixture('unterminated-raw-string.go');
    const parsedTexts = parseFixture('unterminated-raw-string.go');
    const str = byText(parsedTexts, 'never closed');

    expect(str?.rawText).toBe('`never closed');
    expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    expect(str?.range).toEqual([content.indexOf('`'), content.length]);
  });

  describe('raw-string-no-escapes.go', () => {
    // Regression coverage: a raw string never processes backslash escapes, unlike an interpreted string or
    // a rune literal - a backslash right before the closing backtick must not "escape" it. If scanGoRawString
    // ever grew escape handling (treating "\`" as one skipped unit, the way scanQuotedString treats "\\\""),
    // this raw string would run away past its real close, swallowing the "ok" string on the next line into
    // its own text instead of ending exactly where the source does.
    const parsedTexts = parseFixture('raw-string-no-escapes.go');

    it('closes the raw string right after the trailing backslash, not at end of file', () => {
      const str = byText(parsedTexts, 'C:\\new\\test\\path and a lone backslash at the end \\');
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('still recognizes the interpreted string that follows on the next line', () => {
      expect(byText(parsedTexts, 'ok')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('still recognizes both leading line comments', () => {
      const nonStrings = parsedTexts.filter((p) => p.tags?.comment);
      expect(nonStrings).toHaveLength(2);
    });
  });

  describe('unterminated literals ending in a trailing lone backslash', () => {
    // Regression coverage mirroring @cspell/parser-typescript-strings-comments's equivalent test (itself
    // tracing back to a Copilot review finding on @cspell/parser-strings-comments PR #60): an escape-skip
    // that blindly advances two characters (`i += 2`) can land past `content.length` when the backslash it's
    // skipping is the very last character in the file, producing a `range`/`map` that doesn't match
    // `rawText`'s actual length.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText?.length);
    }

    it('a plain double-quoted string', () => {
      const content = 'var s = "abc\\';
      const parsedTexts = [...parse(content, 'file.go').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
    });

    it('a single-quoted rune literal', () => {
      const content = "var r = 'a\\";
      const parsedTexts = [...parse(content, 'file.go').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
    });
  });

  describe('createParser', () => {
    const content = '// a comment\n"a string"\n';

    it('defaults to the "go-strings-comments" name and keeps everything when called with no options', () => {
      const customized = createParser();
      expect(customized.name).toBe('go-strings-comments');

      const parsedTexts = [...customized.parse(content, 'file.go').parsedTexts];
      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(true);
    });

    it('filters segments by tag when tags is given', () => {
      const customized = createParser({ tags: { '*': false, comment: true } });
      const parsedTexts = [...customized.parse(content, 'file.go').parsedTexts];

      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(false);
    });
  });

  it('tags the unhandled Go code between segments (identifiers, keywords, punctuation) as code', () => {
    const rawTexts = [...parse(readFixture('comments-and-strings.go'), 'fixtures/comments-and-strings.go').parsedTexts];
    const code = rawTexts.filter((p) => p.tags?.code);
    expect(code.length).toBeGreaterThan(0);
    expect(code.every((p) => p.tags?.code === true)).toBe(true);
    // "func Add(a, b int) int" is ordinary Go code, not a comment/string segment, so it should surface via `code`.
    expect(code.some((p) => p.text.includes('func Add(a, b int) int'))).toBe(true);
  });

  describe('parse (named export used directly by the Parser)', () => {
    it('parser.parse wraps the raw parse export, filtering out code by default', () => {
      const content = '// a comment\nvar total = 0\n"a string"\n';
      const raw = [...parse(content, 'file.go').parsedTexts];
      const filtered = [...parser.parse(content, 'file.go').parsedTexts];

      expect(raw.some((p) => p.tags?.code)).toBe(true);
      expect(filtered.some((p) => p.tags?.code)).toBe(false);
      expect(filtered).toEqual(raw.filter((p) => !p.tags?.code));
    });
  });

  describe('tags', () => {
    it('declares every tag the Scanner actually emits, across every fixture', () => {
      // Regression coverage for a tag silently becoming impossible to filter: `PluginParser.customize` only
      // knows about tags listed in `parser.tags`, so a tag the Scanner emits but `tags` doesn't declare
      // would never be reachable via `createParser`/`customizePlugin`'s `tags` option, with no error to
      // catch the mistake.
      const emittedTags = new Set<string>();
      for (const fixture of readdirSync(fixturesDir)) {
        const content = readFixture(fixture);
        for (const p of [...parse(content, `fixtures/${fixture}`).parsedTexts]) {
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
