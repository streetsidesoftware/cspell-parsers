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

describe('typescript-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('comments-and-strings.ts');
    const result = parser.parse(content, 'fixtures/comments-and-strings.ts');

    expect(result.filename).toBe('fixtures/comments-and-strings.ts');
    expect(result.content).toBe(content);
  });

  describe('comments-and-strings.ts', () => {
    const content = readFixture('comments-and-strings.ts');
    const parsedTexts = parseFixture('comments-and-strings.ts');

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

    it('tags a single-quoted string as string.singleQuote', () => {
      const str = byText(parsedTexts, 'A');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('treats a backslash-escaped quote as staying inside the string', () => {
      const str = byText(parsedTexts, 'she said \\"hi\\" then left');
      expect(str).toBeDefined();
    });
  });

  it('extends an unterminated block comment to the end of the file', () => {
    const content = readFixture('unterminated.ts');
    const [comment] = parseFixture('unterminated.ts');

    expect(comment?.text).toBe('never closed');
    expect(comment?.rawText).toBe('/* never closed');
    expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    expect(comment?.range).toEqual([content.indexOf('/*'), content.length]);
  });

  describe('template-literal.ts', () => {
    const parsedTexts = parseFixture('template-literal.ts');

    it('extracts single- and double-quoted strings', () => {
      expect(byText(parsedTexts, 'friend')?.tags).toEqual({ string: true, 'string.singleQuote': true });
      expect(byText(parsedTexts, 'the visitor')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('splits a template literal into fragments around every ${...} hole', () => {
      const fragments = parsedTexts.filter((p) => p.tags?.['string.templateLiteral']);
      expect(fragments.map((f) => f.text)).toEqual(['Hello, ', '! You have ', ' new ', ', ', '.']);
    });

    it('recurses into a ${...} hole to find the nested string literals in the ternary branches', () => {
      expect(byText(parsedTexts, 'message')?.tags).toEqual({ string: true, 'string.singleQuote': true });
      expect(byText(parsedTexts, 'messages')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('component.tsx', () => {
    it('parses .tsx the same way as .ts', () => {
      const parsedTexts = parseFixture('component.tsx');
      expect(byText(parsedTexts, '!')?.tags).toEqual({ string: true, 'string.singleQuote': true });
      const fragments = parsedTexts.filter((p) => p.tags?.['string.templateLiteral']);
      expect(fragments.map((f) => f.text)).toEqual(['Welcome, ']);
    });
  });

  describe('component.jsx', () => {
    it('parses .jsx the same way as .tsx', () => {
      const parsedTexts = parseFixture('component.jsx');
      expect(byText(parsedTexts, '!')?.tags).toEqual({ string: true, 'string.singleQuote': true });
      const fragments = parsedTexts.filter((p) => p.tags?.['string.templateLiteral']);
      expect(fragments.map((f) => f.text)).toEqual(['Welcome, ']);
    });
  });

  describe('regex-adjacent-quote.ts', () => {
    // This scanner doesn't recognize regex literals (see README's "Known limitations"), so a quote inside
    // one can be mistaken for a string's opening quote. canPrecedeString() mitigates the common cases: a
    // quote directly preceded by an identifier character or another quote can never be a real string's
    // start in valid JS/TS, so it's left alone instead of kicking off a runaway "string" that swallows
    // everything up to the next matching quote in the file.
    const parsedTexts = parseFixture('regex-adjacent-quote.ts');

    it("does not mistake an apostrophe in a contraction for a string (/don't|won't|can't/)", () => {
      expect(parsedTexts.some((p) => p.text.includes("don't"))).toBe(false);
    });

    it('does not mistake either quote in a /[\\w"\'].*/ character class for a string', () => {
      expect(parsedTexts.some((p) => p.text.includes('\\w'))).toBe(false);
    });

    it('still recognizes the real string after both regexes, proving neither ran away past it', () => {
      const str = byText(parsedTexts, 'still recognized as a real string');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('is not thrown off by an unrelated division earlier on the same line as a regex with a contraction', () => {
      // Regression coverage: sawSlash (scanCode's gate for canPrecedeString, see its doc comment) must be
      // sticky rather than toggled per "/" - a single division operator is an unpaired "/" that would
      // otherwise cancel out against the regex's own opening "/" and turn the guard off right where it's
      // needed.
      const content = "const x = a / b; const re = /don't/; const s = 'real string';\n";
      const parsed = [...parse(content, 'file.ts').parsedTexts];
      expect(byText(parsed, 'real string')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('does not clear sawSlash after a quote it accepted mid-regex, if still inside the same regex', () => {
      // Regression coverage: sawSlash must NOT reset to false after successfully scanning a quoted string.
      // A regex this scanner doesn't recognize can contain a quote pair that canPrecedeString accepts as a
      // real string (e.g. the "quoted" below, immediately preceded by the regex's own opening "/", which
      // canPrecedeString treats as safe) followed - still inside that same regex, with no new "/" in
      // between - by a genuinely risky quote (the apostrophe in "it's", preceded by "t"). Clearing sawSlash
      // right after the accepted "quoted" would stop guarding that apostrophe, letting it run away again.
      const content = "const re = /\"quoted\"|it's/;\n// after\nconst s = 'real string';\n";
      const parsed = [...parse(content, 'file.ts').parsedTexts];
      expect(byText(parsed, 'after')?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(byText(parsed, 'real string')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('unterminated literals ending in a trailing lone backslash', () => {
    // Regression coverage for a Copilot review finding on @cspell/parser-strings-comments PR #60: an
    // escape-skip that blindly advances two characters (`i += 2`) can land past `content.length` when the
    // backslash it's skipping is the very last character in the file, producing a `range`/`map` that
    // doesn't match `rawText`'s actual length.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText?.length);
    }

    it('a plain double-quoted string', () => {
      const content = 'const s = "abc\\';
      const [str] = [...parse(content, 'file.ts').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });

    it('a template literal', () => {
      const content = 'const s = `abc\\';
      const [str] = [...parse(content, 'file.ts').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });
  });

  describe('createParser', () => {
    const content = '// a comment\n"a string"\n';

    it('defaults to the "typescript-strings-comments" name and keeps everything when called with no options', () => {
      const customized = createParser();
      expect(customized.name).toBe('typescript-strings-comments');

      const parsedTexts = [...customized.parse(content, 'file.ts').parsedTexts];
      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(true);
    });

    it('filters segments by tag when tags is given', () => {
      const customized = createParser({ tags: { '*': false, comment: true } });
      const parsedTexts = [...customized.parse(content, 'file.ts').parsedTexts];

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
