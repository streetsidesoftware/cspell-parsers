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

describe('java-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('comments-and-strings.java');
    const result = parser.parse(content, 'fixtures/comments-and-strings.java');

    expect(result.filename).toBe('fixtures/comments-and-strings.java');
    expect(result.content).toBe(content);
  });

  describe('comments-and-strings.java', () => {
    const content = readFixture('comments-and-strings.java');
    const parsedTexts = parseFixture('comments-and-strings.java');

    it('extracts a line comment and tags it', () => {
      const comment = parsedTexts[0];
      expect(comment?.text).toBe('running total');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(comment?.range).toEqual([content.indexOf('//'), content.indexOf('//') + '// running total'.length]);
    });

    it('extracts a trailing line comment', () => {
      const comment = byText(parsedTexts, 'trailing note');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('extracts a single-line block comment and tags it', () => {
      const comment = byText(parsedTexts, 'approximate');
      expect(comment?.rawText).toBe('/* approximate */');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('tags a /** */ comment as a Javadoc doc comment, stripping the "*" gutter', () => {
      // The comment is indented (nested inside a class body), so the closing "*/" line's own
      // indentation - beyond stripCommentMarkers' single padding-space trim - is left in place as
      // trailing whitespace; harmless for spell checking (it's not a word), so this asserts on the
      // trimmed content rather than the exact raw text.
      const comment = parsedTexts.find((p) => p.tags?.['comment.block.doc']);
      expect(comment?.text.trim()).toBe('Adds two numbers together.');
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

    it('treats a backslash-escaped quote inside a char literal as staying inside it', () => {
      const str = byText(parsedTexts, "\\'");
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('treats a backslash-escaped double quote as staying inside the string', () => {
      const str = byText(parsedTexts, 'she said \\"hi\\" then left');
      expect(str).toBeDefined();
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  it('extends an unterminated block comment to the end of the file', () => {
    const content = readFixture('unterminated.java');
    const [comment] = parseFixture('unterminated.java');

    expect(comment?.text).toBe('never closed');
    expect(comment?.rawText).toBe('/* never closed');
    expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    expect(comment?.range).toEqual([content.indexOf('/*'), content.length]);
  });

  describe('java-text-block.java', () => {
    const parsedTexts = parseFixture('java-text-block.java');

    it('tags a line comment', () => {
      expect(byText(parsedTexts, 'Renders a greeting.')?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a /** */ Javadoc comment as a doc comment', () => {
      const comment = byText(parsedTexts, '\nBuilds the message shown on the home page.\n');
      expect(comment?.tags?.['comment.block.doc']).toBe(true);
    });

    it('extracts a """ text block, keeping embedded quotes intact', () => {
      const block = parsedTexts.find((p) => p.tags?.['string.textBlock']);
      expect(block?.text).toContain('Hello, %s!');
      expect(block?.text).toContain('Welcome "aboard".');
      expect(block?.tags).toEqual({ string: true, 'string.textBlock': true });
    });

    it('tags the ordinary "world" string as a plain double-quoted string, not a text block', () => {
      expect(byText(parsedTexts, 'world')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  describe('""" vs "..." dispatch boundary', () => {
    // The scanner only commits to a text block once it has seen all three opening quotes - `"""` - so an
    // ordinary empty string ("") right before a real text block must not be mistaken for the block's own
    // opening delimiter, and a text block whose content happens to start with a quote character must still
    // be recognized correctly.
    it('treats "" (two quotes) as an empty ordinary string, not a text-block open', () => {
      const content = 'String s = "";\n';
      const parsed = [...parse(content, 'File.java').parsedTexts];
      const strings = parsed.filter((p) => p.tags?.string);
      expect(strings).toHaveLength(1);
      expect(strings[0]?.tags).toEqual({ string: true, 'string.doubleQuote': true });
      expect(strings[0]?.text).toBe('');
    });

    it('treats """""" (three-then-three quotes) as an empty text block', () => {
      const content = 'String s = """""";\n';
      const parsed = [...parse(content, 'File.java').parsedTexts];
      const strings = parsed.filter((p) => p.tags?.string);
      expect(strings).toHaveLength(1);
      expect(strings[0]?.tags).toEqual({ string: true, 'string.textBlock': true });
      expect(strings[0]?.text).toBe('');
    });

    it('recognizes a real text block immediately followed by an ordinary string on the next statement', () => {
      const content = 'String a = """\nblock\n""";\nString b = "plain";\n';
      const parsed = [...parse(content, 'File.java').parsedTexts];
      expect(byText(parsed, '\nblock\n')?.tags).toEqual({ string: true, 'string.textBlock': true });
      expect(byText(parsed, 'plain')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  describe('Javadoc detection', () => {
    it('tags "/**/" (four characters) as an ordinary block comment, not a doc comment', () => {
      // "/**/" is "/*" immediately closed by "*/" - there's no room for a 3-character "/**" opener that
      // still leaves a closing "*/" of its own, so this must not be misread as an (empty) Javadoc comment.
      const content = '/**/\n';
      const parsed = [...parse(content, 'File.java').parsedTexts];
      expect(parsed[0]?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('tags "/***/" as a doc comment', () => {
      const content = '/***/\n';
      const parsed = [...parse(content, 'File.java').parsedTexts];
      expect(parsed[0]?.tags).toEqual({ comment: true, 'comment.block': true, 'comment.block.doc': true });
    });

    it('does not tag a plain "/* */" block comment as a doc comment', () => {
      const content = '/* plain */\n';
      const parsed = [...parse(content, 'File.java').parsedTexts];
      expect(parsed[0]?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('strips the "*" gutter from a multi-line Javadoc comment', () => {
      const content = '/**\n * Line one.\n * Line two.\n */\n';
      const parsed = [...parse(content, 'File.java').parsedTexts];
      expect(parsed[0]?.text).toBe('\nLine one.\nLine two.\n');
      expect(parsed[0]?.tags).toEqual({ comment: true, 'comment.block': true, 'comment.block.doc': true });
    });
  });

  describe('unterminated literals at EOF', () => {
    // Regression coverage: an escape-skip that blindly advances two characters (`i += 2`) can land past
    // `content.length` when the backslash it's skipping is the very last character in the file, producing a
    // `range`/`map` that doesn't match `rawText`'s actual length - the same bug class documented in
    // @cspell/parser-typescript-strings-comments's CONTRIBUTING.md.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText?.length);
    }

    it('an unterminated plain double-quoted string, ending in a trailing lone backslash', () => {
      const content = 'String s = "abc\\';
      const parsedTexts = [...parse(content, 'file.java').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('an unterminated char literal, with no closing quote at all', () => {
      const content = "char c = 'a";
      const parsedTexts = [...parse(content, 'file.java').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
      expect(str?.text).toBe('a');
    });

    it('an unterminated text block, with no closing """ at all', () => {
      const content = 'String s = """\nblock content';
      const parsedTexts = [...parse(content, 'file.java').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
      expect(str?.tags).toEqual({ string: true, 'string.textBlock': true });
      expect(str?.text).toBe('\nblock content');
    });

    it('an unterminated text block ending in a trailing lone backslash', () => {
      const content = 'String s = """\nblock\\';
      const parsedTexts = [...parse(content, 'file.java').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
      expect(str?.tags).toEqual({ string: true, 'string.textBlock': true });
    });
  });

  describe('createParser', () => {
    const content = '// a comment\n"a string"\n';

    it('defaults to the "java-strings-comments" name and keeps everything when called with no options', () => {
      const customized = createParser();
      expect(customized.name).toBe('java-strings-comments');

      const parsedTexts = [...customized.parse(content, 'file.java').parsedTexts];
      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(true);
    });

    it('filters segments by tag when tags is given', () => {
      const customized = createParser({ tags: { '*': false, comment: true } });
      const parsedTexts = [...customized.parse(content, 'file.java').parsedTexts];

      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(false);
    });
  });

  it('tags the unhandled Java code between segments (identifiers, keywords, punctuation) as code', () => {
    const rawTexts = [
      ...parse(readFixture('comments-and-strings.java'), 'fixtures/comments-and-strings.java').parsedTexts,
    ];
    const code = rawTexts.filter((p) => p.tags?.code);
    expect(code.length).toBeGreaterThan(0);
    expect(code.every((p) => p.tags?.code === true)).toBe(true);
    // "public class Accumulator" is ordinary Java code, not a comment/string segment, so it should surface via `code`.
    expect(code.some((p) => p.text.includes('public class Accumulator'))).toBe(true);
  });

  describe('parse (named export used directly by the Parser)', () => {
    it('parser.parse wraps the raw parse export, filtering out code by default', () => {
      const content = '// a comment\nint total = 0;\n"a string"\n';
      const raw = [...parse(content, 'file.java').parsedTexts];
      const filtered = [...parser.parse(content, 'file.java').parsedTexts];

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
