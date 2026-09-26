import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parse, parsers } from './parsers.ts';
import { tags } from './tags.ts';

const fixturesDir = join(import.meta.dirname, '../fixtures');

const [parser] = parsers;

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

describe('rust-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('comments-and-strings.rs');
    const result = parser.parse(content, 'fixtures/comments-and-strings.rs');

    expect(result.filename).toBe('fixtures/comments-and-strings.rs');
    expect(result.content).toBe(content);
  });

  describe('comments-and-strings.rs', () => {
    const parsedTexts = parseFixture('comments-and-strings.rs');

    it('tags a "//!" inner line doc comment as comment.line.doc, stripping the marker', () => {
      const line = byText(parsedTexts, 'Module-level inner doc comment.');
      expect(line?.rawText).toBe('//! Module-level inner doc comment.');
      expect(line?.tags).toEqual({ comment: true, 'comment.line': true, 'comment.line.doc': true });
    });

    it('tags a "///" outer line doc comment as comment.line.doc, stripping the marker', () => {
      const line = byText(parsedTexts, 'Adds two numbers together.');
      expect(line?.rawText).toBe('/// Adds two numbers together.');
      expect(line?.tags).toEqual({ comment: true, 'comment.line': true, 'comment.line.doc': true });
    });

    it('tags an ordinary "//" line comment as comment.line, not comment.line.doc', () => {
      const line = byText(parsedTexts, 'running total');
      expect(line?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a plain "/* */" block comment as comment.block', () => {
      const comment = byText(parsedTexts, 'approximate');
      expect(comment?.rawText).toBe('/* approximate */');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('tags a "/** */" outer doc block comment as comment.block.doc, stripping the "*" gutter', () => {
      const comment = byText(parsedTexts, '\nComputes the square of a number.\n');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true, 'comment.block.doc': true });
    });

    it('tags a "/*! */" inner doc block comment as comment.block.doc, stripping the "!" and "*" gutter', () => {
      const comment = byText(parsedTexts, '\nInner doc block comment describing this section.\n');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true, 'comment.block.doc': true });
    });

    it('tags a plain string with the bare string tag - no doubleQuote annotation needed', () => {
      // Rust only ever uses " for strings (' is exclusively char literals, never emitted at all), so
      // there's no quote-style ambiguity to disambiguate the way string.singleQuote/.doubleQuote do in
      // languages with two interchangeable quote characters.
      const str = byText(parsedTexts, 'see http://example.com');
      expect(str?.rawText).toBe('"see http://example.com"');
      expect(str?.tags).toEqual({ string: true });
    });

    it('treats a backslash-escaped quote as staying inside the string', () => {
      const str = byText(parsedTexts, 'she said \\"hi\\" then left');
      expect(str).toBeDefined();
      expect(str?.tags).toEqual({ string: true });
    });

    it('tags a byte string (b"...") as string.byte', () => {
      const str = byText(parsedTexts, 'binary payload marker');
      expect(str?.rawText).toBe('b"binary payload marker"');
      expect(str?.tags).toEqual({ string: true, 'string.byte': true });
    });

    it('tags a C string (c"...") as string.c', () => {
      const str = byText(parsedTexts, 'nul terminated payload marker');
      expect(str?.rawText).toBe('c"nul terminated payload marker"');
      expect(str?.tags).toEqual({ string: true, 'string.c': true });
    });

    it('does not emit anything for a char literal ("\'A\'") - char literals are never spell checked', () => {
      expect(parsedTexts.some((p) => p.rawText === "'A'")).toBe(false);
    });
  });

  describe('nested-comments.rs (block comments nest)', () => {
    const parsedTexts = parseFixture('nested-comments.rs');

    it('treats "/* /* nested */ still open */" as ONE comment, not two', () => {
      const comment = parsedTexts.find((p) => p.rawText === '/* outer /* inner */ still open */');
      expect(comment).toBeDefined();
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
      // If nesting weren't tracked, this would incorrectly close at the FIRST "*/" (right after "inner"),
      // leaving " still open */" behind as unparsed code - the comment's own text would then stop short.
      expect(comment?.text).toContain('still open');
    });

    it('tracks depth through three levels of nesting', () => {
      const comment = parsedTexts.find((p) => p.text.includes('back to level1'));
      expect(comment).toBeDefined();
      expect(comment?.text).toContain('level1');
      expect(comment?.text).toContain('level2');
      expect(comment?.text).toContain('level3');
      expect(comment?.text).toContain('back to level2');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('keeps a doc block comment tagged as doc even when it contains a nested plain comment', () => {
      const comment = parsedTexts.find((p) => p.text.includes('still doc'));
      expect(comment).toBeDefined();
      expect(comment?.text).toContain('nested plain comment');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true, 'comment.block.doc': true });
    });
  });

  describe('raw-strings.rs', () => {
    const parsedTexts = parseFixture('raw-strings.rs');

    it('recognizes a zero-hash raw string (r"...") and applies no escape processing', () => {
      const str = byText(parsedTexts, 'plain raw string with a backslash \\ and no escapes');
      expect(str?.rawText).toBe('r"plain raw string with a backslash \\ and no escapes"');
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('recognizes a one-hash raw string (r#"..."#), keeping an embedded plain quote intact', () => {
      const str = byText(parsedTexts, 'raw string with an embedded "quote" that needs one hash');
      expect(str?.rawText).toBe('r#"raw string with an embedded "quote" that needs one hash"#');
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('recognizes a two-hash raw string, not closing early on an embedded "# (one hash)', () => {
      const str = byText(parsedTexts, 'raw string with an embedded "# that must not close it early');
      expect(str?.rawText).toBe('r##"raw string with an embedded "# that must not close it early"##');
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('recognizes a byte raw string (br"...") the same way as a plain raw string, tagged string.byte.raw', () => {
      const str = byText(parsedTexts, 'byte raw string, no escapes \\ here either');
      expect(str?.rawText).toBe('br"byte raw string, no escapes \\ here either"');
      expect(str?.tags).toEqual({ string: true, 'string.byte': true, 'string.byte.raw': true });
    });

    it('recognizes a C raw string (cr#"..."#) the same way as a plain raw string, tagged string.c.raw', () => {
      const str = byText(parsedTexts, 'C raw string with an embedded "quote" and no escapes \\ either');
      expect(str?.rawText).toBe('cr#"C raw string with an embedded "quote" and no escapes \\ either"#');
      expect(str?.tags).toEqual({ string: true, 'string.c': true, 'string.c.raw': true });
    });
  });

  describe('lifetimes-vs-chars.rs (char literals and lifetimes are not specially recognized)', () => {
    // Char/byte-char literals and lifetimes get no special handling - a bare "'" is just ordinary code.
    // Exception: '"' and '\"' (see CONTRIBUTING.md), which run() special-cases just enough to skip safely.
    const parsedTexts = parseFixture('lifetimes-vs-chars.rs');

    it.each([
      ["'a'", 'a plain char literal'],
      [String.raw`'\n'`, 'an escape-based char literal'],
      [String.raw`'\''`, 'an escaped-quote (single) char literal'],
      [String.raw`'\x41'`, 'a byte-escape char literal'],
      [String.raw`'\u{1F600}'`, 'a unicode-escape char literal'],
      ["b'x'", 'a byte-char literal'],
      [String.raw`b'\n'`, 'an escape-based byte-char literal'],
      [String.raw`b'\x41'`, 'a byte-escape byte-char literal'],
    ])('does not emit anything with rawText %j (%s)', (rawText) => {
      expect(parsedTexts.some((p) => p.rawText === rawText)).toBe(false);
    });

    it('does not emit anything for the lifetime tick in "Wrapper<\'a>"', () => {
      const content = readFixture('lifetimes-vs-chars.rs');
      const tickIndex = content.indexOf("<'a>") + 1;
      expect(parsedTexts.some((p) => p.range[0] === tickIndex)).toBe(false);
    });

    it('does not emit anything for a lifetime-annotated reference ("&\'a str")', () => {
      const content = readFixture('lifetimes-vs-chars.rs');
      const tickIndex = content.indexOf("&'a str") + 1;
      expect(parsedTexts.some((p) => p.range[0] === tickIndex)).toBe(false);
    });

    it('does not emit anything for the "\'static" lifetime', () => {
      expect(parsedTexts.some((p) => p.rawText?.includes("'static"))).toBe(false);
      expect(byText(parsedTexts, 'static')).toBeUndefined();
    });

    it('does not emit anything for the "\'_\'" underscore lifetime', () => {
      expect(parsedTexts.some((p) => p.rawText?.includes("'_"))).toBe(false);
    });

    it('still tags the ordinary "hello" string literal correctly alongside the lifetime on the same line', () => {
      expect(byText(parsedTexts, 'hello')?.tags).toEqual({ string: true });
    });

    it.each([
      ["'\"'", 'a real string that must still be recognized correctly'],
      [String.raw`'\"'`, 'a real string that must still be recognized correctly after an escaped quote'],
    ])(
      'a %j char literal is skipped as one unit, so a real string right after it is still recognized',
      (_raw, text) => {
        // Without this, the embedded '"' would look like the start of a real string to scanQuotedString,
        // which would scan past the literal's actual closing "'" looking for another '"' - see CONTRIBUTING.md.
        expect(byText(parsedTexts, text)?.tags).toEqual({ string: true });
      },
    );
  });

  it('extends an unterminated block comment (with a nested comment inside it) to the end of the file', () => {
    const content = readFixture('unterminated.rs');
    const [comment] = parseFixture('unterminated.rs');

    expect(comment?.text).toBe('never closed, even with a nested /* inner */ inside it');
    expect(comment?.rawText).toBe(content);
    expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    expect(comment?.range).toEqual([0, content.length]);
  });

  describe('unterminated literals ending mid-token at EOF', () => {
    // Regression coverage for the same class of bug documented in @cspell/parser-typescript-strings-comments:
    // an escape-skip that blindly advances two characters can land past content.length when the backslash it
    // is skipping is the very last character in the file, producing a range/map that doesn't match rawText.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText?.length);
    }

    it('a plain double-quoted string with a trailing lone backslash', () => {
      const content = 'let s = "abc\\';
      const parsed = [...parse(content, 'file.rs').parsedTexts];
      const str = parsed.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
    });

    it('an unterminated plain double-quoted string with no trailing backslash', () => {
      const content = 'let s = "abc';
      const parsed = [...parse(content, 'file.rs').parsedTexts];
      const str = parsed.find((p) => p.tags?.string);
      expect(str?.text).toBe('abc');
      expectRangeMatchesRawText(str, content);
    });

    it('an unterminated raw string', () => {
      const content = 'let s = r#"abc';
      const parsed = [...parse(content, 'file.rs').parsedTexts];
      const str = parsed.find((p) => p.tags?.string);
      expect(str?.text).toBe('abc');
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
      expectRangeMatchesRawText(str, content);
    });
  });

  describe('word-boundary guards on the "r"/"b"/"c"/"br"/"cr" prefixes', () => {
    it('does not mistake an identifier ending in "r" immediately before a quote for a raw-string prefix', () => {
      // No separator between "author" and the quote - without the boundary guard, the trailing "r" would be
      // read as a zero-hash raw-string prefix (r"data") instead of the last letter of the identifier.
      const content = 'author"data"\n';
      const parsed = [...parse(content, 'file.rs').parsedTexts];
      expect(byText(parsed, 'data')?.tags).toEqual({ string: true });
    });

    it('does not mistake an identifier ending in "b" immediately before a quote for a byte-string prefix', () => {
      // No separator between "verb" and the quote - without the boundary guard, the trailing "b" would be
      // read as a byte-string prefix (b"data") instead of the last letter of the identifier.
      const content = 'verb"data"\n';
      const parsed = [...parse(content, 'file.rs').parsedTexts];
      expect(byText(parsed, 'data')?.tags).toEqual({ string: true });
    });

    it('does not mistake an identifier ending in "c" immediately before a quote for a C-string prefix', () => {
      // No separator between "magic" and the quote - without the boundary guard, the trailing "c" would be
      // read as a C-string prefix (c"data") instead of the last letter of the identifier.
      const content = 'magic"data"\n';
      const parsed = [...parse(content, 'file.rs').parsedTexts];
      expect(byText(parsed, 'data')?.tags).toEqual({ string: true });
    });
  });

  it('tags the unhandled Rust code between comments and strings as code', () => {
    const content = 'let x = 1; // comment\n';
    const parsedTexts = [...parse(content, 'file.rs').parsedTexts];

    const code = parsedTexts.find((p) => p.tags?.code);
    expect(code?.text).toBe('let x = 1; ');
  });

  it('parser.parse wraps the raw parse export, filtering out code by default', () => {
    const content = 'let x = 1; // comment\n';

    const raw = [...parse(content, 'file.rs').parsedTexts];
    const filtered = [...parser.parse(content, 'file.rs').parsedTexts];

    expect(raw.some((p) => p.tags?.code)).toBe(true);
    expect(filtered.some((p) => p.tags?.code)).toBe(false);
  });

  describe('tags', () => {
    it('declares every tag the scanner can emit', () => {
      const content = readFixture('comments-and-strings.rs');
      const parsedTexts = [...parse(content, 'file.rs').parsedTexts];
      const emittedTags = new Set(parsedTexts.flatMap((p) => Object.keys(p.tags ?? {})));

      for (const tag of emittedTags) {
        expect(tags).toHaveProperty(tag);
      }
    });

    it('is off by default for code', () => {
      expect(tags.code).toBe(false);
    });

    it('is on by default for everything else', () => {
      for (const [tag, onByDefault] of Object.entries(tags)) {
        if (tag === 'code') continue;
        expect(onByDefault).toBe(true);
      }
    });
  });
});
