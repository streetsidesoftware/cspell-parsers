// cspell:ignore EOTHING
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

describe('strings-comments parser', () => {
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
    const parsedTexts = parseFixture('raw-strings.cpp');

    it('extracts a plain R"(...)" raw string without treating its contents as escapes/comments', () => {
      const str = byText(parsedTexts, 'C:\\path\\to\\file "quoted" // not a comment');
      expect(str?.tags).toEqual({ string: true, 'string.raw': true });
    });

    it('honors a custom delimiter, matching only ")DELIM\\"" as the close', () => {
      const str = byText(parsedTexts, "has a ) paren and even )DEL which isn't quite the closer");
      expect(str).toBeDefined();
    });

    it('extracts a second raw string after the first one closes', () => {
      expect(byText(parsedTexts, 'second raw string')).toBeDefined();
    });

    it('does not treat "notRaw" as an R"..." prefix', () => {
      expect(parsedTexts.some((p) => p.text.includes('notRaw'))).toBe(false);
    });
  });

  describe('java-text-block.java', () => {
    const parsedTexts = parseFixture('java-text-block.java');

    it('tags a line comment', () => {
      expect(byText(parsedTexts, 'Renders a greeting.')?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a /** */ javadoc comment as a doc comment', () => {
      const comment = byText(parsedTexts, '\nBuilds the message shown on the home page.\n');
      expect(comment?.tags?.['comment.block.doc']).toBe(true);
    });

    it('extracts a """ text block, keeping embedded quotes intact', () => {
      const block = parsedTexts.find((p) => p.tags?.['string.textBlock']);
      expect(block?.text).toContain('Hello, %s!');
      expect(block?.text).toContain('Welcome "aboard".');
      expect(block?.tags).toEqual({ string: true, 'string.textBlock': true });
    });
  });

  describe('csharp-strings.cs', () => {
    const parsedTexts = parseFixture('csharp-strings.cs');

    it('tags a "///" XML doc comment line as comment.line.doc', () => {
      const line = byText(parsedTexts, '<summary>');
      expect(line?.tags).toEqual({ comment: true, 'comment.line': true, 'comment.line.doc': true });
    });

    it('tags an ordinary "//" comment as a plain line comment', () => {
      expect(byText(parsedTexts, 'the person being greeted')?.tags).toEqual({
        comment: true,
        'comment.line': true,
      });
    });

    it('tags a /* */ block comment', () => {
      expect(byText(parsedTexts, 'Combines the parts into one line.')?.tags).toEqual({
        comment: true,
        'comment.block': true,
      });
    });

    it('extracts a verbatim string, keeping single backslashes as literal characters', () => {
      const str = byText(parsedTexts, 'C:\\Users\\name\\file.txt');
      expect(str?.tags).toEqual({ string: true, 'string.verbatim': true });
    });

    it('decodes nothing for a doubled quote in a verbatim string (kept as "" in the text)', () => {
      expect(byText(parsedTexts, 'she said ""hello"" softly')).toBeDefined();
    });

    it('splits an interpolated string into fragments around {holes}', () => {
      expect(byText(parsedTexts, 'Hello, ')?.tags).toEqual({ string: true, 'string.interpolated': true });
      expect(byText(parsedTexts, '! Today is ')?.tags).toEqual({ string: true, 'string.interpolated': true });
    });

    it('tags a combined verbatim+interpolated ($@"...") fragment with both tags', () => {
      expect(byText(parsedTexts, 'Path is ')?.tags).toEqual({
        string: true,
        'string.verbatim': true,
        'string.interpolated': true,
      });
    });

    it('extracts a triple-quoted raw string literal', () => {
      const raw = parsedTexts.find((p) => p.tags?.['string.raw'] && !p.tags?.['string.interpolated']);
      expect(raw?.text).toContain('A raw string literal');
      expect(raw?.text).toContain('embedded "quoted" word');
    });
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
    it('parses .tsx using the same js-family dialect as .ts', () => {
      const parsedTexts = parseFixture('component.tsx');
      expect(byText(parsedTexts, '!')?.tags).toEqual({ string: true, 'string.singleQuote': true });
      const fragments = parsedTexts.filter((p) => p.tags?.['string.templateLiteral']);
      expect(fragments.map((f) => f.text)).toEqual(['Welcome, ']);
    });
  });

  describe('comments-and-strings.go', () => {
    const parsedTexts = parseFixture('comments-and-strings.go');

    it('tags a "//" comment as a plain line comment', () => {
      expect(byText(parsedTexts, 'Package greeting builds friendly messages for the CLI.')?.tags).toEqual({
        comment: true,
        'comment.line': true,
      });
    });

    it('tags a /* */ block comment', () => {
      expect(byText(parsedTexts, 'Combines a name with a fixed prefix.')?.tags).toEqual({
        comment: true,
        'comment.block': true,
      });
    });

    it('extracts a double-quoted string', () => {
      expect(byText(parsedTexts, 'Hello, ')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('tags a rune literal as string.singleQuote', () => {
      expect(byText(parsedTexts, '\\n')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('extracts a backtick raw string as string.raw, ignoring the fake escapes/comment inside it', () => {
      const raw = byText(parsedTexts, 'C:\\path\\to\\file "quoted" // not a comment');
      expect(raw?.tags).toEqual({ string: true, 'string.raw': true });
    });
  });

  describe('mixed.php', () => {
    const parsedTexts = parseFixture('mixed.php');

    it('passes through HTML outside <?php ?> tags as untagged markup', () => {
      const markup = parsedTexts.find((p) => p.tags?.markup);
      expect(markup?.text).toContain('<h1>Welcome</h1>');
    });

    it('extracts a "//" comment inside the PHP block', () => {
      expect(byText(parsedTexts, 'running total')?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('extracts a "#" comment inside the PHP block', () => {
      expect(byText(parsedTexts, 'shell-style comment')?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a /** */ PHPDoc comment as a doc comment', () => {
      expect(byText(parsedTexts, '\nBuilds the page footer.\n')?.tags?.['comment.block.doc']).toBe(true);
    });

    it('extracts a heredoc body and resolves "{$arr[\'key\']}" without ending early on the nested quotes', () => {
      const greeting = byText(parsedTexts, "Hello, {$arr['key']}! Welcome, $name.");
      expect(greeting?.tags).toEqual({ string: true, 'string.doubleQuote': true });

      const heredoc = parsedTexts.find((p) => p.tags?.['string.heredoc']);
      expect(heredoc?.text).toContain('Hello, {$name}!');
      expect(heredoc?.text).toContain('EOTHING');
    });

    it('extracts a nowdoc body, tagged separately from heredoc', () => {
      const nowdoc = parsedTexts.find((p) => p.tags?.['string.nowdoc']);
      expect(nowdoc?.text).toContain('No $interpolation happens in here.');
    });

    it('passes through the trailing HTML after the closing ?> tag', () => {
      const markup = parsedTexts.filter((p) => p.tags?.markup);
      expect(markup.some((p) => p.text.includes('Thanks for stopping by.'))).toBe(true);
    });
  });

  describe('unterminated literals ending in a trailing lone backslash', () => {
    // Regression coverage for a Copilot review finding on PR #60: an escape-skip that blindly advances two
    // characters (`i += 2`) can land past `content.length` when the backslash it's skipping is the very
    // last character in the file, producing a `range`/`map` that doesn't match `rawText`'s actual length.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText.length);
    }

    it('a plain double-quoted string (scanQuotedString)', () => {
      const content = 'const s = "abc\\';
      const [str] = [...parse(content, 'file.c').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });

    it('a JS/TS template literal (scanTemplateLiteral)', () => {
      const content = 'const s = `abc\\';
      const [str] = [...parse(content, 'file.ts').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });

    it('a C# interpolated string (scanCSharpInterpolatedString)', () => {
      const content = 'var s = $"abc\\';
      const [str] = [...parse(content, 'file.cs').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });

    it('a Java text block (scanJavaTextBlock)', () => {
      const content = 'String s = """abc\\';
      const [str] = [...parse(content, 'file.java').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });
  });

  describe('createParser', () => {
    const content = '// a comment\n"a string"\n';

    it('defaults to the "strings-comments" name and keeps everything when called with no options', () => {
      const customized = createParser();
      expect(customized.name).toBe('strings-comments');

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
