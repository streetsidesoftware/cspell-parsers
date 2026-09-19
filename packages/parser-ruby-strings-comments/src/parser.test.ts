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

describe('ruby-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('comments-and-strings.rb');
    const result = parser.parse(content, 'fixtures/comments-and-strings.rb');

    expect(result.filename).toBe('fixtures/comments-and-strings.rb');
    expect(result.content).toBe(content);
  });

  describe('comments-and-strings.rb', () => {
    const parsedTexts = parseFixture('comments-and-strings.rb');

    it('extracts a line comment and tags it', () => {
      const comment = parsedTexts[0];
      expect(comment?.text).toBe('running total');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('extracts a trailing line comment', () => {
      const comment = byText(parsedTexts, 'trailing note');
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('extracts an =begin/=end block comment, stripping both marker lines', () => {
      const comment = byText(parsedTexts, 'Adds two numbers together.\nSecond line of the block comment.\n');
      expect(comment?.rawText).toBe('=begin\nAdds two numbers together.\nSecond line of the block comment.\n=end');
      expect(comment?.tags).toEqual({ comment: true, 'comment.block': true });
    });

    it('does not treat "=begin" as a block-comment opener unless it is at column 0', () => {
      // "result =begin_value" - "=begin" appears mid-line, not at the start of a line, so it must stay
      // ordinary code: no block comment (and no separate segment of any kind) should start there.
      expect(byText(parsedTexts, 'begin_value')).toBeUndefined();
      const blockComments = parsedTexts.filter((p) => p.tags?.['comment.block']);
      expect(blockComments).toHaveLength(1);
    });

    it('tags a single-quoted string as string.singleQuote', () => {
      const str = byText(parsedTexts, 'Alice');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('splits a double-quoted string into fragments around every #{...} hole', () => {
      const start = parsedTexts.findIndex((p) => p.text === 'Hello, ');
      const fragments = parsedTexts.slice(start, start + 3);
      expect(fragments.map((f) => f.text)).toEqual(['Hello, ', '! You have ', ' new messages.']);
    });

    it('treats a backslash-escaped quote as staying inside a double-quoted string', () => {
      const str = byText(parsedTexts, 'she said \\"hi\\" then left');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('treats a backslash-escaped quote as staying inside a single-quoted string', () => {
      const str = byText(parsedTexts, "it\\'s fine");
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('extracts a double-quoted string with no interpolation as a single fragment', () => {
      const str = byText(parsedTexts, 'see http://example.com');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  describe('heredocs.rb', () => {
    const parsedTexts = parseFixture('heredocs.rb');

    it('extracts a bare <<~ heredoc body raw, without dedenting its leading whitespace', () => {
      const str = byText(parsedTexts, "  SELECT *\n  FROM users\n  WHERE name = 'Alice'\n");
      expect(str?.tags).toEqual({ string: true, 'string.heredoc': true });
    });

    it('does not scan a <<- heredoc body as code, even when it looks like a comment and a string', () => {
      const body = byText(
        parsedTexts,
        '  Some dashed heredoc text.\n' +
          '  # This looks like a comment but must not be scanned as code.\n' +
          '  puts "should not be treated as a real string either"\n',
      );
      expect(body?.tags).toEqual({ string: true, 'string.heredoc': true });
      // Neither the fake comment nor the fake string inside the heredoc body was separately recognized.
      expect(parsedTexts.some((p) => p.tags?.comment && p.text.includes('looks like a comment'))).toBe(false);
      expect(byText(parsedTexts, 'should not be treated as a real string either')).toBeUndefined();
    });

    it('recognizes a plain <<ID heredoc with an unindented closing marker', () => {
      const str = byText(parsedTexts, 'Plain heredoc marker with no leading whitespace before the terminator.\n');
      expect(str?.tags).toEqual({ string: true, 'string.heredoc': true });
    });

    it("does not interpolate a single-quoted <<~'ID' heredoc marker", () => {
      const str = byText(
        parsedTexts,
        '  No #{interpolation} happens in here - this is literal text, braces and all.\n',
      );
      expect(str?.tags).toEqual({ string: true, 'string.heredoc': true });
    });

    it('interpolates a double-quoted <<~"ID" heredoc marker, splitting around #{...}', () => {
      const start = parsedTexts.findIndex((p) => p.text === '  Quoted double-quoted marker still interpolates: ');
      const fragments = parsedTexts.slice(start, start + 2);
      expect(fragments.map((f) => f.text)).toEqual(['  Quoted double-quoted marker still interpolates: ', '.\n']);
    });

    it('does not treat a body line that merely starts with the marker as the closing terminator', () => {
      // Regression coverage: the closing-marker regex must be anchored to the end of the line (only
      // trailing whitespace allowed after the marker) - without that anchor, a body line like "SQL:" would
      // still match "SQL" followed by a non-identifier character and wrongly close the heredoc early,
      // even though "SQL" isn't alone on that line.
      const content =
        'sql = <<~SQL\n' +
        '  SQL: this line starts with the marker but keeps going.\n' +
        '  Still inside the heredoc.\n' +
        'SQL\n' +
        'puts sql\n';
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      const body = byText(
        parsed,
        '  SQL: this line starts with the marker but keeps going.\n  Still inside the heredoc.\n',
      );
      expect(body?.tags).toEqual({ string: true, 'string.heredoc': true });
    });
  });

  describe('regex-division.rb', () => {
    // isOperandContext (gating tryScanRegexLiteral) recognizes a real regex literal and skips it as one
    // opaque unit - including its own quote/slash characters - never spell checking it at all (see
    // README's "Known limitations": regex content is intentionally excluded from spell checking outright).
    const parsedTexts = parseFixture('regex-division.rb');

    it("emits only the file's comments and its two real strings - nothing from inside any regex", () => {
      const nonComments = parsedTexts.filter((p) => !p.tags?.comment);
      expect(nonComments).toHaveLength(2);
      expect(nonComments.map((p) => p.text)).toEqual(['matched', 'still a real string']);
    });

    it('recognizes a regex right after "if", not ordinary division', () => {
      // If /foo/ weren't recognized as a regex here, "foo" would be scanned as ordinary code and nothing
      // extra would appear - but a wrongly-matched runaway regex could instead swallow real content,
      // changing the count asserted above.
      const nonComments = parsedTexts.filter((p) => !p.tags?.comment);
      expect(nonComments).toHaveLength(2);
    });

    it('does not mistake ordinary division (identifier, number, call, paren, bracket) for a regex', () => {
      const nonComments = parsedTexts.filter((p) => !p.tags?.comment);
      expect(nonComments).toHaveLength(2);
    });

    it('treats a same-line "}" as division/append-like, so a real string right after it is never swallowed', () => {
      // Regression coverage: this must happen on one line - a newline before reaching the unrelated "/"
      // that opens the trailing regex would already make tryScanRegexLiteral bail out on its own (regexes
      // can't span a line), which would mask a broken isOperandContext even though the bug is real. See
      // CONTRIBUTING.md for why "}" is deliberately biased toward division/append, not regex/heredoc.
      const content = "computed = { a: 1 } / 2; real = 'should be checked'; re = /pattern/\n";
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(byText(parsed, 'should be checked')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('unterminated.rb', () => {
    it('extends an unterminated heredoc body to the end of the file', () => {
      const content = readFixture('unterminated.rb');
      const parsedTexts = parseFixture('unterminated.rb');
      const [body] = parsedTexts;

      expect(body?.text).toBe('  This heredoc never finds its closing marker before the file ends.\n');
      expect(body?.tags).toEqual({ string: true, 'string.heredoc': true });
      expect(body?.range[1]).toBe(content.length);
    });
  });

  describe('regex-vs-division and heredoc-vs-left-shift ambiguity (inline regression coverage)', () => {
    it('is not thrown off by an unrelated division earlier on the same line as a regex with a contraction', () => {
      const content = "x = a / b; re = /don't/; s = 'real string'\n";
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(byText(parsed, 'real string')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('recognizes a regex containing quote characters, then still recognizes a comment and string after it', () => {
      const content = "re = /\"quoted\"|it's/\n# after\ns = 'real string'\n";
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(byText(parsed, 'after')?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(byText(parsed, 'real string')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('does not treat "arr << x" (left-shift/append onto an identifier) as a heredoc opener', () => {
      const content = "arr << x\ns = 'real string'\n";
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(parsed.some((p) => p.tags?.['string.heredoc'])).toBe(false);
      expect(byText(parsed, 'real string')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('does treat "puts <<~MSG" (a whitelisted bare method call) as a heredoc opener', () => {
      const content = 'puts <<~MSG\n  hello there\nMSG\n';
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(byText(parsed, '  hello there\n')?.tags).toEqual({ string: true, 'string.heredoc': true });
    });
  });

  describe('unterminated literals ending in a trailing lone backslash', () => {
    // Regression coverage mirroring @cspell/parser-typescript-strings-comments's own test for the same class
    // of bug: an escape-skip that blindly advances two characters can land past `content.length` when the
    // backslash it's skipping is the very last character in the file.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText?.length);
    }

    it('a plain double-quoted string', () => {
      const content = 's = "abc\\';
      const [str] = [...parse(content, 'file.rb').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });

    it('an unterminated heredoc body', () => {
      const content = 'x = <<~EOS\nabc\\';
      const [body] = [...parse(content, 'file.rb').parsedTexts];
      expect(body?.text.endsWith('\\')).toBe(true);
      expect(body?.range[1]).toBeLessThanOrEqual(content.length);
    });
  });

  describe('createParser', () => {
    const content = "# a comment\n'a string'\n";

    it('defaults to the "ruby-strings-comments" name and keeps everything when called with no options', () => {
      const customized = createParser();
      expect(customized.name).toBe('ruby-strings-comments');

      const parsedTexts = [...customized.parse(content, 'file.rb').parsedTexts];
      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(true);
    });

    it('filters segments by tag when tags is given', () => {
      const customized = createParser({ tags: { '*': false, comment: true } });
      const parsedTexts = [...customized.parse(content, 'file.rb').parsedTexts];

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
