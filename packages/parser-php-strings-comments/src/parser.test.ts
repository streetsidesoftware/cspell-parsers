// cspell:ignore EOTHING
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { createParse } from '@internal/utils';
import { describe, expect, it } from 'vitest';

import { createParser, parse, parser } from './parser.ts';

const fixturesDir = join(import.meta.dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

function parseFixture(name: string, parse = parser.parse): ParsedText[] {
  const content = readFixture(name);
  return [...parse(content, `fixtures/${name}`).parsedTexts];
}

function byText(parsedTexts: ParsedText[], text: string): ParsedText | undefined {
  return parsedTexts.find((p) => p.text === text);
}

describe('php-strings-comments parser', () => {
  it('preserves the filename and full content on the result', () => {
    const content = readFixture('mixed.php');
    const result = parser.parse(content, 'fixtures/mixed.php');

    expect(result.filename).toBe('fixtures/mixed.php');
    expect(result.content).toBe(content);
  });

  describe('strings.php', () => {
    const parsedTexts = parseFixture('strings.php');

    it('tags a single-quoted string as string.singleQuote, with no interpolation applied', () => {
      const str = byText(parsedTexts, 'Hello, $name! No interpolation here.');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('tags a double-quoted string as string.doubleQuote', () => {
      const str = byText(parsedTexts, 'see http://example.com');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('treats a backslash-escaped quote as staying inside the string', () => {
      const str = byText(parsedTexts, 'She said \\"hi\\" then left.');
      expect(str).toBeDefined();
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  describe('interpolation.php - {$...} complex interpolation is skipped, not split', () => {
    const parsedTexts = parseFixture('interpolation.php');

    it('resolves a {$...} hole whose nested quote never matches the outer delimiter', () => {
      // If skipPhpBraceInterpolation/skipSimpleQuoted weren't invoked at all, this would still happen to
      // work, since the nested quote is a "'" inside a "..."-delimited string - this case alone can't prove
      // the interpolation-skip logic is doing anything.
      const str = byText(parsedTexts, "Value: {$arr['key']}!");
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('resolves a {$...} hole whose nested quote matches the outer delimiter (the real risk case)', () => {
      // Regression coverage for a real Copilot-caught bug in the combined @cspell/parser-strings-comments
      // package: here the nested quote is a '"' inside a "..."-delimited string too, which *would* be
      // mistaken for the string's own closing quote without skipPhpBraceInterpolation actually skipping
      // over the {$...} hole (via skipSimpleQuoted) rather than just looking for the next bare '"'.
      const str = byText(parsedTexts, 'Value: {$arr["key"]}!');
      expect(str?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('emits the whole interpolated string as one opaque blob, not split around the {$...} hole', () => {
      // Three string segments should come out of this file's three interpolated strings, plus the plain
      // 'key'/'value' single-quoted strings from the $arr literal itself - unlike a JS template literal,
      // PHP's {$...} hole is never split out into its own separate ParsedText.
      const doubleQuoted = parsedTexts.filter((p) => p.tags?.['string.doubleQuote']);
      expect(doubleQuoted.map((p) => p.text)).toEqual([
        "Value: {$arr['key']}!",
        'Value: {$arr["key"]}!',
        "X: {$arr['a}\"']}!",
      ]);
    });

    it('does not end the string early on a nested "}" followed by a quote matching the outer delimiter', () => {
      // Regression coverage for the exact failure mode skipSimpleQuoted exists to prevent: without it,
      // brace-depth tracking alone would treat the "}" inside the nested 'a}"' key as closing the
      // interpolation hole right there, leaving the following '"' character to be misread by the outer
      // scanQuotedString loop as its own closing quote - truncating the string well before its real end.
      const risky = byText(parsedTexts, "X: {$arr['a}\"']}!");
      expect(risky).toBeDefined();
      expect(risky?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  describe('heredoc-nowdoc.php', () => {
    const parsedTexts = parseFixture('heredoc-nowdoc.php');

    it('tags a heredoc body as string.heredoc and keeps its {$...} hole inline', () => {
      const heredoc = parsedTexts.find((p) => p.tags?.['string.heredoc']);
      expect(heredoc?.text).toContain('Hello, {$name}!');
      expect(heredoc?.text).toContain('Interpolation is active in here.');
      expect(heredoc?.tags).toEqual({ string: true, 'string.heredoc': true });
    });

    it('does not mistake a line starting with the marker ID plus more identifier characters for the close', () => {
      // Regression coverage for the closing-marker regex's negative lookahead (?![A-Za-z0-9_]): a body line
      // that starts with "GREETINGS" (the marker "GREETING" immediately followed by more identifier
      // characters) must not be mistaken for the real "GREETING;" closing line - if it were, the heredoc
      // would end one line early and never contain the real closing line's own content check below.
      const heredoc = parsedTexts.find((p) => p.tags?.['string.heredoc']);
      expect(heredoc?.text).toContain('GREETINGS are not the closing marker');
    });

    it('tags a nowdoc body as string.nowdoc, separately from heredoc', () => {
      const nowdoc = parsedTexts.find((p) => p.tags?.['string.nowdoc']);
      expect(nowdoc?.text).toContain('Hello, {$name}!');
      expect(nowdoc?.text).toContain('No interpolation happens in a nowdoc.');
      expect(nowdoc?.tags).toEqual({ string: true, 'string.nowdoc': true });
    });

    it('does not merge the heredoc and nowdoc bodies into one segment', () => {
      const bodies = parsedTexts.filter((p) => p.tags?.['string.heredoc'] || p.tags?.['string.nowdoc']);
      expect(bodies).toHaveLength(2);
    });
  });

  describe('attributes.php - "#[" is a PHP 8 attribute, never a "#" comment', () => {
    const parsedTexts = parseFixture('attributes.php');

    it('extracts a real "#" line comment', () => {
      expect(byText(parsedTexts, 'A real shell-style comment.')?.tags).toEqual({
        comment: true,
        'comment.line': true,
      });
    });

    it('does not treat "#[Attribute]" as a comment', () => {
      // If "#[" were mistaken for a "#" comment, everything from "#[Attribute]" onward up to the next
      // newline (or, worse, further) would be swallowed as comment text instead of left as ordinary code -
      // in particular "class Logger" would never be reached as separate code, and no *comment*-tagged
      // segment containing "Attribute" should ever show up (it legitimately shows up in `code` segments now).
      const comments = parsedTexts.filter((p) => p.tags?.comment);
      expect(comments.some((p) => p.text.includes('Attribute'))).toBe(false);
    });

    it('still recognizes ordinary code (a real string) right after an attribute line', () => {
      const str = byText(parsedTexts, 'use the new logger instead');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('does not mistake a "#[" that carries constructor arguments for a comment either', () => {
      // All three "#[...]" attribute lines in this fixture must stay out of `comment` - only the one real
      // "#" comment above should be tagged `comment` (everything else falls out as `code`).
      const comments = parsedTexts.filter((p) => p.tags?.comment);
      expect(comments).toHaveLength(1);
    });
  });

  describe('close-tag.php - "?>" drops back to HTML markup mode', () => {
    const parsedTexts = parseFixture('close-tag.php');

    it('extracts PHP code before the first "?>"', () => {
      expect(byText(parsedTexts, 'hello')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('passes the HTML between "?>" and the next "<?php" through as html', () => {
      const html = parsedTexts.filter((p) => p.tags?.html);
      expect(html.some((p) => p.text.includes('Plain HTML after the closing tag.'))).toBe(true);
    });

    it('ends a "//" line comment early at a "?>" appearing mid-comment, without consuming it as text', () => {
      const comment = byText(parsedTexts, 'this comment is cut short right here');
      expect(comment).toBeDefined();
      expect(comment?.tags).toEqual({ comment: true, 'comment.line': true });
      expect(comment?.rawText).not.toContain('?>');
    });

    it('resumes html mode right after the "?>" that closed the comment early', () => {
      const html = parsedTexts.filter((p) => p.tags?.html);
      expect(html.some((p) => p.text.includes('and this becomes markup'))).toBe(true);
    });

    it('resumes PHP code mode again at the next "<?php"', () => {
      const str = byText(parsedTexts, 'still valid code');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('short-echo.php - "<?=" is a short-echo PHP open tag', () => {
    const parsedTexts = parseFixture('short-echo.php');

    it('passes through the HTML around the PHP regions as html', () => {
      const html = parsedTexts.filter((p) => p.tags?.html);
      expect(html.some((p) => p.text.includes('<ul>'))).toBe(true);
      expect(html.some((p) => p.text.includes('</ul>'))).toBe(true);
    });

    it('scans code starting right after "<?=" the same as after "<?php"', () => {
      const str = byText(parsedTexts, 'item: ');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('mixed.php', () => {
    const parsedTexts = parseFixture(
      'mixed.php',
      createParse(parse, () => true),
    );

    it('passes through HTML outside <?php ?> tags tagged html', () => {
      const html = parsedTexts.find((p) => p.tags?.html);
      expect(html?.text).toContain('<h1>Welcome</h1>');
    });

    it('tags an html segment with only html, as a sibling of code rather than nested under it', () => {
      const html = parsedTexts.find((p) => p.tags?.html);
      expect(html?.tags).toEqual({ html: true });
    });

    it('extracts a "//" comment inside the PHP block', () => {
      expect(byText(parsedTexts, 'running total')?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('extracts a "#" comment inside the PHP block', () => {
      expect(byText(parsedTexts, 'shell-style comment')?.tags).toEqual({ comment: true, 'comment.line': true });
    });

    it('tags a /** */ comment as a doc comment, stripping the "*" gutter', () => {
      expect(byText(parsedTexts, '\nBuilds the page footer.\n')?.tags).toEqual({
        comment: true,
        'comment.block': true,
        'comment.block.doc': true,
      });
    });

    it('extracts a single-quoted string', () => {
      expect(byText(parsedTexts, 'thanks for visiting')?.tags).toEqual({
        string: true,
        'string.singleQuote': true,
      });
    });

    it("resolves a {$arr['key']} hole inside a heredoc without ending early on the nested quotes", () => {
      const heredoc = parsedTexts.find((p) => p.tags?.['string.heredoc']);
      expect(heredoc?.text).toContain('Hello, {$name}!');
      expect(heredoc?.text).toContain('EOTHING');
    });

    it('extracts a nowdoc body, tagged separately from heredoc', () => {
      const nowdoc = parsedTexts.find((p) => p.tags?.['string.nowdoc']);
      expect(nowdoc?.text).toContain('No $interpolation happens in here.');
    });

    it('passes through the trailing HTML after the closing ?> tag', () => {
      const html = parsedTexts.filter((p) => p.tags?.html);
      expect(html.some((p) => p.text.includes('Thanks for stopping by.'))).toBe(true);
    });

    it('tags the unhandled PHP code between segments (identifiers, keywords, punctuation) as code', () => {
      const code = parsedTexts.filter((p) => p.tags?.code);
      expect(code.length).toBeGreaterThan(0);
      expect(code.every((p) => p.tags?.code === true && !p.tags?.html)).toBe(true);
      // "echo" is ordinary PHP code, not a comment/string/html segment, so it should surface via `code`.
      expect(code.some((p) => p.text.includes('echo'))).toBe(true);
    });
  });

  describe('unterminated literals ending in a trailing lone backslash', () => {
    // Regression coverage, ported from @cspell/parser-strings-comments: an escape-skip that blindly
    // advances two characters (`i += 2`) can land past `content.length` when the backslash it's skipping is
    // the very last character in the file, producing a `range`/`map` that doesn't match `rawText`'s actual
    // length.
    function expectRangeMatchesRawText(p: ParsedText | undefined, content: string): void {
      expect(p).toBeDefined();
      expect(p?.range[1]).toBeLessThanOrEqual(content.length);
      expect((p?.range[1] ?? 0) - (p?.range[0] ?? 0)).toBe(p?.rawText?.length);
    }

    it('a plain double-quoted string', () => {
      const content = '<?php $s = "abc\\';
      const [str] = [...parse(content, 'file.php').parsedTexts];
      expectRangeMatchesRawText(str, content);
    });
  });

  describe('createParser', () => {
    const content = "<?php // a comment\n$s = 'a string';\n";

    it('defaults to the "php-strings-comments" name and keeps everything when called with no options', () => {
      const customized = createParser();
      expect(customized.name).toBe('php-strings-comments');

      const parsedTexts = [...customized.parse(content, 'file.php').parsedTexts];
      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(true);
    });

    it('filters segments by tag when tags is given', () => {
      const customized = createParser({ tags: { '*': false, comment: true } });
      const parsedTexts = [...customized.parse(content, 'file.php').parsedTexts];

      expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
      expect(parsedTexts.some((p) => p.text === 'a string')).toBe(false);
    });
  });

  describe('parse (named export used directly by the Parser)', () => {
    it('parser.parse wraps the raw parse export, filtering out code by default', () => {
      const content = "<?php // a comment\n$s = 'a string';\n";
      const raw = [...parse(content, 'file.php').parsedTexts];
      const filtered = [...parser.parse(content, 'file.php').parsedTexts];

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
