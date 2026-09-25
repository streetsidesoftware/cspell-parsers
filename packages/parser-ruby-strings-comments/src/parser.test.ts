import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { createParser, parse, parser } from './parser.ts';

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

    it('does not close a plain <<ID heredoc on an indented line that merely matches the marker', () => {
      // Regression coverage: real Ruby requires a plain (non-~/-) heredoc's closing marker at column 0
      // specifically, so an indented occurrence of the marker word inside the body is just body content,
      // not the terminator - unlike <<~/<<- heredocs, where an indented marker legitimately does close it.
      const str = byText(
        parsedTexts,
        'Body text before the indented lookalike line.\n' +
          '  PLAIN2\n' +
          'Body text after it - an indented occurrence of the marker is not the terminator for a plain heredoc.\n',
      );
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

    it('closes a <<~ heredoc on an indented closing marker (unlike a plain <<ID heredoc)', () => {
      // Regression coverage for the plain-vs-~/- distinction: <<~/<<- both legitimately allow the closing
      // marker to be indented, so this must still close here, in contrast to the plain-heredoc test above.
      const content = 'sql = <<~SQL\n  indented body\n  SQL\nputs sql\n';
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(byText(parsed, '  indented body\n')?.tags).toEqual({ string: true, 'string.heredoc': true });
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

  describe('percent-literals.rb', () => {
    // tryScanPercentLiteral (gating: isOperandContext) recognizes %w[]/%i[]/%q()/%Q{}/%r{} and skips each as
    // one opaque unit, exactly like a regex literal - never emitting anything for it. This exists to close a
    // real correctness gap, not just to cover more syntax: without it, an embedded quote inside any of these
    // (e.g. %w[don't stop]) reaches the ordinary quote dispatch and kicks off a runaway string scan that
    // swallows real code after it - see CONTRIBUTING.md.
    const parsedTexts = parseFixture('percent-literals.rb');

    it('emits only the comment and the one real string - nothing from inside any percent-literal', () => {
      const nonComments = parsedTexts.filter((p) => !p.tags?.comment);
      expect(nonComments).toHaveLength(1);
      expect(nonComments[0]?.text).toBe('still a real string after every percent-literal above');
    });

    it('does not swallow the real string that follows a %w[] containing an apostrophe', () => {
      expect(byText(parsedTexts, "don't stop believing")).toBeUndefined();
    });

    it('tracks nesting depth so a bracket-delimited literal is not closed early by a nested pair', () => {
      // %w(foo (bar) baz) is ONE literal - without depth tracking, the first ")" (right after "bar") would
      // close it early, leaving " baz)" behind as unparsed code.
      expect(parsedTexts.some((p) => p.text.includes('baz'))).toBe(false);
    });
  });

  describe('char-literals-and-backticks.rb', () => {
    // ?'/?"/?# (a one-character-string literal whose one character is a quote or "#") and backtick command
    // strings are two more shapes that can trigger the same runaway-scan failure mode as an unrecognized
    // percent-literal, if left unrecognized - see CONTRIBUTING.md.
    const parsedTexts = parseFixture('char-literals-and-backticks.rb');

    it.each([
      ["?'", 'quote'],
      ['?"', 'double-quote'],
      ['?#', 'hash'],
    ])(
      'does not emit anything for the %j char literal, and the real string after it is still recognized',
      (rawText) => {
        expect(parsedTexts.some((p) => p.rawText === rawText)).toBe(false);
      },
    );

    it('does not emit anything for a plain char literal ("?a")', () => {
      expect(parsedTexts.some((p) => p.rawText === '?a')).toBe(false);
    });

    it('still recognizes a ternary\'s strings normally, whether or not there is a space after "?"', () => {
      expect(byText(parsedTexts, 'yes')).toBeDefined();
      expect(byText(parsedTexts, 'no')).toBeDefined();
      expect(parsedTexts.filter((p) => p.text === 'yes')).toHaveLength(2);
    });

    it('tags a backtick command string as string.backtick', () => {
      const str = byText(parsedTexts, "ls -la 'My Documents'");
      expect(str?.rawText).toBe("ls -la 'My Documents'");
      expect(str?.tags).toEqual({ string: true, 'string.backtick': true });
    });

    it("does not swallow the real string after a backtick command containing a quote (`ls -la 'My Documents'`)", () => {
      const real = byText(parsedTexts, 'still a real string, unaffected by anything above');
      expect(real?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('splits an interpolated backtick command string into fragments around #{...}', () => {
      const start = parsedTexts.findIndex((p) => p.text === 'echo ');
      const fragments = parsedTexts.slice(start, start + 2);
      expect(fragments.map((f) => f.text)).toEqual(['echo ', ' today']);
      expect(fragments.every((f) => f.tags?.['string.backtick'])).toBe(true);
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

    it('extends an unterminated percent-literal to the end of the file without crashing', () => {
      const content = "words = %w[foo bar\nreal = 'unreachable, but must not throw'";
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      // Never emits a dedicated segment for the percent-literal itself - the embedded quote must not be
      // read as a real string boundary - so the whole file falls through as one `code` segment.
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.tags?.code).toBe(true);
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

    it('does not treat "<<" right after a string literal\'s closing quote as a heredoc opener (append)', () => {
      // Regression coverage: isOperandContext must recognize a closing quote as a value, the same as
      // ")"/"]"/"}" - without that, "a"<<"b" (ordinary string append, no spaces) reads as a <<"b" heredoc
      // opener, swallowing everything up to a line containing just "b" as its unscanned body.
      const content = 's = "a"<<"b"\nreal = \'still a real string\'\n';
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(parsed.some((p) => p.tags?.['string.heredoc'])).toBe(false);
      expect(byText(parsed, 'a')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
      expect(byText(parsed, 'b')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
      expect(byText(parsed, 'still a real string')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('special cases documented in README.md', () => {
    it("keeps a string nested in a #{...} hole under its own tag, not the surrounding string's", () => {
      const content = 'x = "Hi #{name ? \'nested\' : 1} there"\n';
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(byText(parsed, 'nested')?.tags).toEqual({ string: true, 'string.singleQuote': true });
      expect(byText(parsed, 'Hi ')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('does not check a second heredoc or a string after a heredoc marker on the same line', () => {
      const content = 'foo(<<~A, <<~B, "trailing")\n  first\nA\n  second\nB\n';
      const parsed = [...parse(content, 'file.rb').parsedTexts].filter((p) => !p.tags?.code);
      expect(parsed.map((p) => p.text)).toEqual(['  first\n']);
    });

    it('leaves regex and percent-literal content in code, with no tag of its own', () => {
      const content = 'if x =~ /pattern/\n  y = %w[words]\nend\n';
      const parsed = [...parse(content, 'file.rb').parsedTexts];
      expect(parsed.map((p) => p.tags)).toEqual([{ code: true }]);
    });

    it('skips a bare symbol but checks a quoted symbol as a string', () => {
      const content = 'a = :bare\nb = :"double quoted"\nc = :\'single quoted\'\n';
      const parsed = [...parse(content, 'file.rb').parsedTexts].filter((p) => !p.tags?.code);
      expect(parsed.map((p) => [p.text, p.tags])).toEqual([
        ['double quoted', { string: true, 'string.doubleQuote': true }],
        ['single quoted', { string: true, 'string.singleQuote': true }],
      ]);
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
      const parsedTexts = [...parse(content, 'file.rb').parsedTexts];
      const str = parsedTexts.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
    });

    it('an unterminated heredoc body', () => {
      const content = 'x = <<~EOS\nabc\\';
      const parsedTexts = [...parse(content, 'file.rb').parsedTexts];
      const body = parsedTexts.find((p) => p.tags?.['string.heredoc']);
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

  it('tags the unhandled Ruby code between segments (identifiers, keywords, punctuation) as code', () => {
    const rawTexts = [...parse(readFixture('comments-and-strings.rb'), 'fixtures/comments-and-strings.rb').parsedTexts];
    const code = rawTexts.filter((p) => p.tags?.code);
    expect(code.length).toBeGreaterThan(0);
    expect(code.every((p) => p.tags?.code === true)).toBe(true);
    // "total = 0" is ordinary Ruby code, not a comment/string segment, so it should surface via `code`.
    expect(code.some((p) => p.text.includes('total = 0'))).toBe(true);
  });

  describe('parse (named export used directly by the Parser)', () => {
    it('parser.parse wraps the raw parse export, filtering out code by default', () => {
      const content = "# a comment\ntotal = 0\n'a string'\n";
      const raw = [...parse(content, 'file.rb').parsedTexts];
      const filtered = [...parser.parse(content, 'file.rb').parsedTexts];

      expect(raw.some((p) => p.tags?.code)).toBe(true);
      expect(filtered.some((p) => p.tags?.code)).toBe(false);
      expect(filtered).toEqual(raw.filter((p) => !p.tags?.code));
    });
  });

  describe('tags', () => {
    it('declares every tag the Scanner actually emits, across every fixture', () => {
      // Regression coverage for a tag silently becoming impossible to filter: `IParser.customize` only
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
