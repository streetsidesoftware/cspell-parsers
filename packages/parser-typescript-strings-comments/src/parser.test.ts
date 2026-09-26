// cspell:ignore myreturn
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parse, parser } from './parser.ts';
import { tags } from './tags.ts';

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

    it('recognizes comments inside a ${...} hole', () => {
      const texts = [...parse('const m = `A ${/* block note */ x} B ${y // line note\n} C`;\n', 'a.ts').parsedTexts];
      expect(texts.find((t) => t.text === 'block note')?.tags).toEqual({ comment: true, 'comment.block': true });
      expect(texts.find((t) => t.text === 'line note')?.tags).toEqual({ comment: true, 'comment.line': true });
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

  describe('regex-literals.ts', () => {
    // tryScanRegexLiteral (gated by isDivisionContext) recognizes a real regex literal and skips it as one
    // opaque unit, so nothing inside it - including its quote characters - ever reaches the string dispatch
    // at all. canPrecedeString/sawSlash (see their own doc comments) remain a fallback for the cases this
    // can't tell apart from division (see README's "Known limitations"), but every case in this fixture is
    // fully and cleanly recognized as a regex, with nothing spurious emitted from inside any of them.
    const parsedTexts = parseFixture('regex-literals.ts');

    it("emits only the file's // comments and its two real strings - nothing from inside any regex", () => {
      // Every regex body in the fixture (a contraction, a class opening right after "[", a class containing
      // a literal "/", an escaped "/", and one with flags) must contribute nothing at all: if any of them
      // were misread, either a spurious fragment of its body would show up as a "string", or - worse - it
      // would run away and swallow real content past it, changing this count.
      const nonComments = parsedTexts.filter((p) => !p.tags?.comment);
      expect(nonComments).toHaveLength(2);
      expect(nonComments[0]).toMatchObject({
        text: 'still a real string',
        tags: { string: true, 'string.singleQuote': true },
      });
    });

    it('recognizes a regex right after "return", even though "return" ends in an identifier character', () => {
      // If this weren't recognized, the apostrophe in "it's a regex" would at best be caught by the
      // canPrecedeString fallback (preceded by "s", an identifier char - safe) or at worst run away; either
      // way something other than exactly the two real strings above would show up as non-comment text.
      const nonComments = parsedTexts.filter((p) => !p.tags?.comment);
      expect(nonComments).toHaveLength(2);
    });

    it('does not mistake ordinary division, or an identifier merely ending in keyword letters, for a regex', () => {
      // divisionAfter{Identifier,Number,Call,Paren,Bracket} and divisionAfterKeywordLikeIdentifier
      // ("myreturn / 2", not the "return" keyword) must all be left as ordinary code. If any "/" among them
      // were wrongly treated as a regex-start, tryScanRegexLiteral would scan ahead for the next unrelated
      // "/" as if it were the closing delimiter, potentially swallowing everything up to and including
      // `trailingRegex`'s own "/pattern/" - again changing the non-comment count asserted above.
      const nonComments = parsedTexts.filter((p) => !p.tags?.comment);
      expect(nonComments).toHaveLength(2);
    });

    it("skips both arguments of a new RegExp('pattern', 'flags') call - the pattern and the flags", () => {
      expect(parsedTexts.some((p) => p.text.includes("don't|won't"))).toBe(false);
      expect(parsedTexts.some((p) => p.text === 'gi')).toBe(false);
    });

    it('still recognizes a comment inside a RegExp(...) call, even though the string argument is skipped', () => {
      expect(parsedTexts.some((p) => p.text.includes('not spell checked, but this comment still is'))).toBe(true);
      expect(parsedTexts.some((p) => p.text.includes('another pattern'))).toBe(false);
    });

    it('does not mistake a longer identifier merely containing "RegExp" for the global constructor', () => {
      const str = byText(parsedTexts, 'this string is checked normally');
      expect(str?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });

    it('treats a same-line "}" as division-like, so a real string right after it is never swallowed', () => {
      // Regression coverage: "}" closes both a block statement (often followed by a real regex) and an
      // object literal (often followed by division) - genuinely ambiguous. Defaulting to "division" is the
      // safe choice: getting it wrong just misses a regex (falls back to the character-level heuristic),
      // whereas defaulting to "regex" risks tryScanRegexLiteral succeeding on real division ("{ a: 1 } / 2")
      // by scanning ahead to the next unrelated "/" - here, `/pattern/`'s own opening delimiter - as if it
      // were the closing one, silently swallowing "should be checked" in between. This must happen on one
      // line: a newline before reaching that unrelated "/" would already make tryScanRegexLiteral bail out
      // on its own (regexes can't span a line), which is exactly why this fixture's own equivalent case
      // (spread across separate lines) doesn't actually exercise this - this inline case does.
      const content = 'const x = { a: 1 } / 2; const s = "should be checked"; const re = /pattern/;\n';
      const parsed = [...parse(content, 'file.ts').parsedTexts];
      expect(byText(parsed, 'should be checked')?.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });
  });

  describe('module-specifiers.ts', () => {
    // isModuleSpecifierContext tags the string in an import/export/require/dynamic-import statement with
    // the whole module/module.specifier/module.specifier.literal chain, plus ".module" appended to its own
    // quote-style tag - same convention as @cspell/parser-typescript - so customizePlugin can filter module
    // specifiers out independently of ordinary strings.
    const parsedTexts = parseFixture('module-specifiers.ts');
    const MODULE_SINGLE_QUOTE_TAGS = {
      string: true,
      'string.singleQuote': true,
      'string.singleQuote.module': true,
      module: true,
      'module.specifier': true,
      'module.specifier.literal': true,
    };

    it.each([
      ['./mod.js', 'a default import'],
      ['prettier', 'a named import of a bare package specifier'],
      ['./namespace.js', 'a namespace import'],
      ['./side-effect.js', 'a bare side-effect import'],
      ['./star.js', 'an export * from'],
      ['./dynamic.js', 'a dynamic import()'],
      ['./required.js', 'a require()'],
    ])('tags %j (%s) with the module.specifier.literal chain', (text) => {
      expect(byText(parsedTexts, text)?.tags).toEqual(MODULE_SINGLE_QUOTE_TAGS);
    });

    it('tags a double-quoted module specifier with the .doubleQuote.module chain, symmetric with single-quoted', () => {
      expect(byText(parsedTexts, './double-quoted.js')?.tags).toEqual({
        string: true,
        'string.doubleQuote': true,
        'string.doubleQuote.module': true,
        module: true,
        'module.specifier': true,
        'module.specifier.literal': true,
      });
    });

    it('tags the module specifier of a re-export ("export { x } from ...") the same way', () => {
      // ./mod.js appears twice (the import and the re-export) - just confirm every occurrence is tagged.
      const occurrences = parsedTexts.filter((p) => p.text === './mod.js');
      expect(occurrences).toHaveLength(2);
      for (const occurrence of occurrences) {
        expect(occurrence.tags).toEqual(MODULE_SINGLE_QUOTE_TAGS);
      }
    });

    it('does not tag unrelated strings that merely look similar: "from"/"require" as ordinary identifiers', () => {
      // "from" used as a variable name, a function merely named like "require", and a ".from(...)" method
      // call are all real, legal JS/TS that must be spell checked as plain strings, not module specifiers.
      expect(byText(parsedTexts, 'not a module specifier')?.tags).toEqual({
        string: true,
        'string.singleQuote': true,
      });
      expect(byText(parsedTexts, './not-a-specifier.js')?.tags).toEqual({
        string: true,
        'string.singleQuote': true,
      });
      expect(byText(parsedTexts, '2024-01-01')?.tags).toEqual({ string: true, 'string.singleQuote': true });
    });
  });

  describe('canPrecedeString/sawSlash fallback (for regexes tryScanRegexLiteral does not attempt)', () => {
    it('is not thrown off by an unrelated division earlier on the same line as a regex with a contraction', () => {
      // Regression coverage: sawSlash must be sticky, not toggled per "/" - a single division operator is
      // an unpaired "/" that would otherwise cancel out against a later "/" and turn the guard off right
      // where it's needed. (tryScanRegexLiteral now handles this exact case directly too, since the
      // division and the regex are independently context-checked - this test guards the fallback path
      // itself in case some future change stops the regex from being recognized as one.)
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
      const parsed = [...parse(content, 'file.ts').parsedTexts];
      const str = parsed.find((p) => p.tags?.string);
      expectRangeMatchesRawText(str, content);
    });

    it('a template literal', () => {
      const content = 'const s = `abc\\';
      const parsed = [...parse(content, 'file.ts').parsedTexts];
      const str = parsed.find((p) => p.tags?.['string.templateLiteral']);
      expectRangeMatchesRawText(str, content);
    });
  });

  it('tags the unhandled TypeScript code between comments and strings as code', () => {
    const content = 'const x = 1; // comment\n';
    const parsedTexts = [...parse(content, 'file.ts').parsedTexts];

    const code = parsedTexts.find((p) => p.tags?.code);
    expect(code?.text).toBe('const x = 1; ');
  });

  it('parser.parse wraps the raw parse export, filtering out code by default', () => {
    const content = 'const x = 1; // comment\n';

    const raw = [...parse(content, 'file.ts').parsedTexts];
    const filtered = [...parser.parse(content, 'file.ts').parsedTexts];

    expect(raw.some((p) => p.tags?.code)).toBe(true);
    expect(filtered.some((p) => p.tags?.code)).toBe(false);
  });

  describe('tags', () => {
    it('declares every tag the scanner can emit', () => {
      const content = readFixture('comments-and-strings.ts');
      const parsedTexts = [...parse(content, 'file.ts').parsedTexts];
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
