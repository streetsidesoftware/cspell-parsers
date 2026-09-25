// cspell:ignore numbr
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parse, parser } from './parser.ts';

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

/**
 * The interpolated fragments whose range falls within the single line of `content` that starts with
 * `needle` - a fragment's own `rawText`/`text` is just that fragment's slice, not the whole f-string literal
 * it came from, so fragments belonging to one literal can't be found by matching against `rawText` directly.
 */
function fragmentsOnLine(parsedTexts: ParsedText[], content: string, needle: string): ParsedText[] {
  const start = content.indexOf(needle);
  const newlineIndex = content.indexOf('\n', start);
  const end = newlineIndex === -1 ? content.length : newlineIndex;
  return parsedTexts.filter((p) => p.tags?.['string.interpolated'] && p.range[0] >= start && p.range[1] <= end);
}

describe('python-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('comments-and-strings.py');
    const result = parser.parse(content, 'fixtures/comments-and-strings.py');

    expect(result.filename).toBe('fixtures/comments-and-strings.py');
    expect(result.content).toBe(content);
  });

  describe('comments-and-strings.py', () => {
    const content = readFixture('comments-and-strings.py');
    const parsedTexts = parseFixture('comments-and-strings.py');

    it('extracts a line comment and tags it', () => {
      const comment = parsedTexts[0];
      expect(comment?.text).toBe('running total');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(comment?.range).toEqual([content.indexOf('#'), content.indexOf('#') + '# running total'.length]);
    });

    it('extracts a trailing line comment after code', () => {
      const comment = byText(parsedTexts, 'trailing note');
      expect(comment?.rawText).toBe('# trailing note');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('keeps the rest of a comment even when it contains quote characters', () => {
      const comment = byText(parsedTexts, "not a real string: 'still just a comment'");
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('does not treat a "#" inside a real string as the start of a comment', () => {
      const str = byText(parsedTexts, 'a # b');
      expect(str?.rawText).toBe('"a # b"');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('tags a triple-quoted string as string.tripleQuote without detecting it as a docstring', () => {
      // Per README's "Known limitations": this parser never treats a triple-quoted string differently
      // based on whether it's the first statement in a module/class/function body - it always gets the
      // same string.tripleQuote tag, regardless of position.
      const str = byText(parsedTexts, 'Adds two numbers together.');
      expect(str?.rawText).toBe('"""Adds two numbers together."""');
      expect(str?.tags).toEqual({ string: true, 'string.tripleQuote': true });
    });

    it('extracts a double-quoted string', () => {
      const str = byText(parsedTexts, 'see http://example.com');
      expect(str?.rawText).toBe('"see http://example.com"');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('tags a single-quoted string as string.singleQuote', () => {
      const str = byText(parsedTexts, 'A');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('treats a backslash-escaped quote as staying inside the string', () => {
      const str = byText(parsedTexts, 'she said \\"hi\\" then left');
      expect(str).toBeDefined();
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('lets a triple-quoted string span multiple literal lines', () => {
      const str = byText(parsedTexts, '\nfirst line\nsecond line\n');
      expect(str?.rawText).toBe('"""\nfirst line\nsecond line\n"""');
      expect(str?.tags).toEqual({ string: true, 'string.tripleQuote': true });
    });
  });

  describe('f-strings.py', () => {
    const content = readFixture('f-strings.py');
    const parsedTexts = parseFixture('f-strings.py');

    it('splits a simple f-string into fragments around its one hole', () => {
      const fragments = fragmentsOnLine(parsedTexts, content, 'greeting =');
      expect(fragments.map((f) => f.text)).toEqual(['Hello, ', '!']);
      expect(fragments[0]?.tags).toEqual({ string: true, 'string.doubleQuote': true, 'string.interpolated': true });
    });

    it('splits an f-string with two holes into three fragments, dropping the empty edges', () => {
      const fragments = fragmentsOnLine(parsedTexts, content, 'report =');
      // The leading fragment (before the first hole) is empty and so isn't emitted at all.
      expect(fragments.map((f) => f.text)).toEqual([' of ', ' done']);
    });

    it('treats {{ and }} as literal braces, not holes', () => {
      const fragments = fragmentsOnLine(parsedTexts, content, 'literal_braces =');
      expect(fragments.map((f) => f.text)).toEqual(['{{not a hole}} but ', ' is']);
    });

    it('recurses into a hole to find a nested function call, without emitting the call itself', () => {
      const fragments = fragmentsOnLine(parsedTexts, content, 'nested_call =');
      expect(fragments.map((f) => f.text)).toEqual(['Value: ']);
      expect(parsedTexts.some((p) => p.text.includes('compute'))).toBe(false);
    });

    it('recurses into a hole to find a real comment nested inside it', () => {
      const comment = byText(parsedTexts, 'the value');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('recurses into a hole to find a real string literal nested inside it', () => {
      const str = byText(parsedTexts, 'nested');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('splits a triple-quoted f-string into fragments the same way, including a literal {{...}} run', () => {
      const fragments = parsedTexts.filter((p) => p.tags?.['string.interpolated'] && p.tags?.['string.tripleQuote']);
      expect(fragments.map((f) => f.text)).toEqual(['\nMulti-line: ', '\nBraces: {{literal}}\n']);
      expect(fragments[0]?.tags).toEqual({
        string: true,
        'string.tripleQuote': true,
        'string.interpolated': true,
      });
    });
  });

  describe('raw-strings.py', () => {
    const content = readFixture('raw-strings.py');
    const parsedTexts = parseFixture('raw-strings.py');

    it('tags a plain r-prefixed string as string.raw, keeping backslashes literal', () => {
      const str = byText(parsedTexts, 'C:\\Users\\test');
      expect(str?.rawText).toBe('r"C:\\Users\\test"');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true, 'string.raw': true });
    });

    it('tags a single-quoted raw string the same way', () => {
      const str = byText(parsedTexts, 'no escapes here \\n stays literal');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true, 'string.raw': true });
    });

    it('still boundary-skips a backslash-quote in a raw string, so it does not end the string early', () => {
      // r"a\"b" - the \" must NOT close the string (Python's own tokenizer treats \<char> as a
      // boundary-skip unit for every string form when finding the end, even in a raw string, which
      // doesn't interpret the escape semantically) - the real close is the final " after "b".
      const str = byText(parsedTexts, 'a\\"b');
      expect(str).toBeDefined();
      expect(str?.rawText).toBe('r"a\\"b"');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true, 'string.raw': true });
    });

    it('tags a plain b-prefixed (bytes) string the same as an ordinary string of the same quote length', () => {
      const str = byText(parsedTexts, 'raw bytes example');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('tags rb and br the same way regardless of letter order', () => {
      expect(byText(parsedTexts, '\\x00\\x01')?.tags).toEqual({
        string: true,
        'string.doubleQuote': true,
        'string.raw': true,
      });
      expect(byText(parsedTexts, '\\x02\\x03')?.tags).toEqual({
        string: true,
        'string.doubleQuote': true,
        'string.raw': true,
      });
    });

    it('tags rf and fr as both raw and interpolated, regardless of letter order', () => {
      const rf = fragmentsOnLine(parsedTexts, content, 'raw_f_string_rf =');
      const fr = fragmentsOnLine(parsedTexts, content, 'raw_f_string_fr =');
      expect(rf.map((f) => f.text)).toEqual(['path: ']);
      expect(fr.map((f) => f.text)).toEqual(['path: ']);
      expect(rf[0]?.tags).toEqual({
        string: true,
        'string.doubleQuote': true,
        'string.raw': true,
        'string.interpolated': true,
      });
      expect(fr[0]?.tags).toEqual(rf[0]?.tags);
    });

    it('does not mistake a prefix-like substring in the middle of a longer identifier for a real prefix', () => {
      // "numbr" ends in "br" (a valid 2-letter prefix), directly followed by a quote - but "br" isn't at
      // a word boundary here (it's the tail of a longer identifier), so detectStringPrefix must reject it
      // and fall back to treating the quote as an ordinary, unprefixed string.
      const str = byText(parsedTexts, 'not a prefix - numbr ends in br, but br is mid-identifier here');
      expect(str?.rawText).toBe('"not a prefix - numbr ends in br, but br is mid-identifier here"');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  describe('unterminated.py', () => {
    const content = readFixture('unterminated.py');
    const parsedTexts = parseFixture('unterminated.py');

    it('extracts the properly closed string first', () => {
      const str = byText(parsedTexts, 'this one is fine');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('extends an unterminated triple-quoted string to the end of the file', () => {
      const str = parsedTexts.find((p) => p.tags?.['string.tripleQuote']);
      expect(str?.text).toBe('this triple-quoted string\nnever gets closed before the end of the file\n');
      expect(str?.rawText).toBe("'''this triple-quoted string\nnever gets closed before the end of the file\n");
      expect(str?.tags).toEqual({ string: true, 'string.tripleQuote': true });
      expect(str?.range).toEqual([content.indexOf("'''"), content.length]);
    });

    it('extends an unterminated single-quoted string to the end of the file', () => {
      // Inline content, rather than a fixture: an unterminated triple-quoted literal already consumes the
      // rest of a file to EOF, so a single-quoted-at-EOF case needs its own tiny standalone snippet.
      const inlineContent = "x = 'abc";
      const parsedTexts = [...parse(inlineContent, 'file.py').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expect(str?.text).toBe('abc');
      expect(str?.rawText).toBe("'abc");
      expect(str?.range).toEqual([4, 8]);
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('unterminated literal ending in a trailing lone backslash', () => {
    // Regression coverage for the same class of bug Copilot's review found in
    // @cspell/parser-strings-comments PR #60: an escape-skip that blindly advances two characters
    // (`i += 2`) can land past `content.length` when the backslash it's skipping is the very last
    // character in the file, producing a `range`/`map` that doesn't match `rawText`'s actual length.
    it('a plain double-quoted string', () => {
      const content = 'x = "abc\\';
      const parsedTexts = [...parse(content, 'file.py').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expect(str?.range[1]).toBeLessThanOrEqual(content.length);
      expect((str?.range[1] ?? 0) - (str?.range[0] ?? 0)).toBe(str?.rawText?.length);
    });

    it('a triple-quoted string', () => {
      const content = 'x = """abc\\';
      const parsedTexts = [...parse(content, 'file.py').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expect(str?.range[1]).toBeLessThanOrEqual(content.length);
      expect((str?.range[1] ?? 0) - (str?.range[0] ?? 0)).toBe(str?.rawText?.length);
    });
  });

  it('tags the unhandled Python code between segments (identifiers, keywords, punctuation) as code', () => {
    const rawTexts = [...parse(readFixture('comments-and-strings.py'), 'fixtures/comments-and-strings.py').parsedTexts];
    const code = rawTexts.filter((p) => p.tags?.code);
    expect(code.length).toBeGreaterThan(0);
    expect(code.every((p) => p.tags?.code === true)).toBe(true);
    // "def add(a, b):" is ordinary Python code, not a comment/string segment, so it should surface via `code`.
    expect(code.some((p) => p.text.includes('def add(a, b):'))).toBe(true);
  });

  describe('parse (named export used directly by the Parser)', () => {
    it('parser.parse wraps the raw parse export, filtering out code by default', () => {
      const content = '# a comment\ntotal = 0\n"a string"\n';
      const raw = [...parse(content, 'file.py').parsedTexts];
      const filtered = [...parser.parse(content, 'file.py').parsedTexts];

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
