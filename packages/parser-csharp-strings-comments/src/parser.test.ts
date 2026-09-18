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

describe('csharp-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('csharp-strings.cs');
    const result = parser.parse(content, 'fixtures/csharp-strings.cs');

    expect(result.filename).toBe('fixtures/csharp-strings.cs');
    expect(result.content).toBe(content);
  });

  describe('csharp-strings.cs', () => {
    const parsedTexts = parseFixture('csharp-strings.cs');

    it('tags a "///" XML doc comment line as comment.line.doc, stripping the marker', () => {
      const line = byText(parsedTexts, '<summary>');
      expect(line?.tags).toEqual({ comment: true, 'comment.line': true, 'comment.line.doc': true });
      expect(byText(parsedTexts, 'Formats a greeting for display.')?.tags).toEqual({
        comment: true,
        'comment.line': true,
        'comment.line.doc': true,
      });
    });

    it('tags an ordinary "//" line comment as comment.line, not comment.line.doc', () => {
      const line = byText(parsedTexts, 'the person being greeted');
      expect(line?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a "/* */" block comment as comment.block', () => {
      const comment = byText(parsedTexts, 'Combines the parts into one line.');
      expect(comment?.rawText).toBe('/* Combines the parts into one line. */');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('tags a plain double-quoted string as string.doubleQuote', () => {
      const str = byText(parsedTexts, 'world');
      expect(str?.rawText).toBe('"world"');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('tags a verbatim string as string.verbatim, keeping backslashes literal', () => {
      const str = byText(parsedTexts, String.raw`C:\Users\name\file.txt`);
      expect(str?.rawText).toBe(String.raw`@"C:\Users\name\file.txt"`);
      expect(str?.tags).toEqual({ string: true, 'string.verbatim': true });
    });

    it('keeps a verbatim string\'s doubled "" quote-escape as-is in the emitted text', () => {
      const str = byText(parsedTexts, 'she said ""hello"" softly');
      expect(str?.tags).toEqual({ string: true, 'string.verbatim': true });
    });

    it('splits an interpolated string into fragments around every {...} hole', () => {
      const fragments = parsedTexts.filter((p) => p.tags?.['string.interpolated'] && !p.tags?.['string.verbatim']);
      expect(fragments.map((f) => f.text)).toEqual(['Hello, ', '! Today is ', '.']);
      for (const fragment of fragments) {
        expect(fragment.tags).toEqual({ string: true, 'string.interpolated': true });
      }
    });

    it('splits a combined $@ verbatim-interpolated string, keeping doubled quotes literal', () => {
      const fragments = parsedTexts.filter((p) => p.tags?.['string.interpolated'] && p.tags?.['string.verbatim']);
      expect(fragments.map((f) => f.text)).toEqual(['Path is ', ' and it has a "" quote']);
      for (const fragment of fragments) {
        expect(fragment.tags).toEqual({ string: true, 'string.verbatim': true, 'string.interpolated': true });
      }
    });

    it('tags a triple-quote raw string literal as string.raw', () => {
      const raw = parsedTexts.find((p) => p.tags?.['string.raw'] && !p.tags?.['string.interpolated']);
      expect(raw?.text).toContain('A raw string literal');
      expect(raw?.text).toContain('with an embedded "quoted" word.');
      expect(raw?.tags).toEqual({ string: true, 'string.raw': true });
    });
  });

  it('extends an unterminated block comment to the end of the file', () => {
    const content = readFixture('unterminated.cs');
    const [comment] = parseFixture('unterminated.cs');

    expect(comment?.text).toBe('never closed');
    expect(comment?.rawText).toBe('/* never closed');
    expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    expect(comment?.range).toEqual([content.indexOf('/*'), content.length]);
  });

  describe('interpolation-holes.cs', () => {
    const parsedTexts = parseFixture('interpolation-holes.cs');

    it("recurses into a {...} hole to find the nested string literals in a ternary's branches", () => {
      expect(byText(parsedTexts, 'one message')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
      expect(byText(parsedTexts, 'several messages')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('recognizes a comment nested inside an interpolation hole', () => {
      const comment = byText(parsedTexts, 'explains the fallback value used when count is negative');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('still yields the fragments of the string containing the recognized hole', () => {
      const fragments = parsedTexts.filter((p) => p.text.includes('Hello,') || p.text.includes('waiting'));
      expect(fragments.length).toBeGreaterThan(0);
    });
  });

  describe('raw-strings.cs', () => {
    const parsedTexts = parseFixture('raw-strings.cs');

    it('recognizes a plain (3-quote) raw string literal', () => {
      const plain = byText(parsedTexts, '\n        The word "quoted" appears without any escaping needed.\n        ');
      expect(plain?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('recognizes a longer quote-run delimiter, tolerating an inner triple-quote run that is too short to close it', () => {
      const longer = parsedTexts.find((p) => p.text.includes('safely.'));
      expect(longer?.text).toContain('"""');
      expect(longer?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it("does not split an interpolated raw string's {...} hole into its own segment (documented simplification)", () => {
      const interpolated = parsedTexts.find((p) => p.text.includes('raw widgets in stock'));
      expect(interpolated?.text).toContain('{count}');
      expect(interpolated?.tags).toEqual({ string: true, 'string.raw': true, 'string.interpolated': true });
    });
  });

  describe('verbatim-interpolated.cs', () => {
    const parsedTexts = parseFixture('verbatim-interpolated.cs');

    it('treats $@ and @$ prefixes identically', () => {
      const fragments = parsedTexts.filter((p) => p.tags?.['string.verbatim'] && p.tags?.['string.interpolated']);
      expect(fragments.map((f) => f.text)).toEqual([
        'Root is ',
        ' and file is ""',
        '""',
        'Root is ',
        ' and file is ""',
        '""',
      ]);
    });
  });

  describe('doc-comment boundary: "///" vs a longer run of slashes', () => {
    it('tags exactly three slashes as comment.line.doc', () => {
      const content = '/// a doc comment\n';
      const parsed = [...parse(content, 'file.cs').parsedTexts];
      expect(byText(parsed, 'a doc comment')?.tags).toEqual({
        comment: true,
        'comment.line': true,
        'comment.line.doc': true,
      });
    });

    it('does not tag a "////" separator line (four-or-more slashes) as a doc comment', () => {
      const content = '//// a plain separator, not a doc comment\n';
      const parsed = [...parse(content, 'file.cs').parsedTexts];
      const line = parsed[0];
      // The marker consumed is only "//", so the text still starts with the extra "//".
      expect(line?.text.startsWith('//')).toBe(true);
      expect(line?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a plain "//" comment as comment.line, not comment.line.doc', () => {
      const content = '// a plain comment\n';
      const parsed = [...parse(content, 'file.cs').parsedTexts];
      expect(byText(parsed, 'a plain comment')?.tags).toEqual({ comment: true, 'comment.line': true });
    });
  });

  describe('unterminated literals ending in a trailing lone backslash', () => {
    // Regression coverage for the same class of bug documented in @cspell/parser-typescript-strings-comments:
    // an escape-skip that blindly advances two characters can land past content.length when the backslash it
    // is skipping is the very last character in the file, producing a range/map that doesn't match rawText.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText?.length);
    }

    it('a plain double-quoted string', () => {
      const content = 'var s = "abc\\';
      const [str] = [...parse(content, 'file.cs').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });

    it('a C# interpolated string (scanCSharpInterpolatedString)', () => {
      const content = 'var s = $"abc\\';
      const [str] = [...parse(content, 'file.cs').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });
  });

  describe('char literals', () => {
    it('tags a single-quoted char literal as string.singleQuote', () => {
      const content = "var c = 'A';\n";
      const parsed = [...parse(content, 'file.cs').parsedTexts];
      expect(byText(parsed, 'A')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('treats a backslash-escaped quote as staying inside the char literal', () => {
      const content = "var c = '\\'';\n";
      const parsed = [...parse(content, 'file.cs').parsedTexts];
      expect(parsed).toHaveLength(1);
    });
  });

  describe('verbatim identifiers ("@" keyword-as-identifier syntax)', () => {
    it('does not mistake a bare "@class" identifier for the start of a string', () => {
      const content = 'var @class = "still checked";\n';
      const parsed = [...parse(content, 'file.cs').parsedTexts];
      expect(byText(parsed, 'still checked')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  describe('createParser', () => {
    const content = '// a comment\n"a string"\n';

    it('defaults to the "csharp-strings-comments" name and keeps everything when called with no options', () => {
      const customized = createParser();
      expect(customized.name).toBe('csharp-strings-comments');

      const parsedTexts = [...customized.parse(content, 'file.cs').parsedTexts];
      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(true);
    });

    it('filters segments by tag when tags is given', () => {
      const customized = createParser({ tags: { '*': false, comment: true } });
      const parsedTexts = [...customized.parse(content, 'file.cs').parsedTexts];

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
