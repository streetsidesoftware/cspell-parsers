import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParsedText } from '@cspell/cspell-types/Parser';
import { describe, expect, it } from 'vitest';

import { plugin } from './plugin.ts';

const fixturesDir = join(import.meta.dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

const parser = plugin.getParser('javascript');
const parse = parser._parse;

function parseFixture(name: string, fileType = 'javascript'): ParsedText[] {
  const content = readFixture(name);
  return [...plugin.getParser(fileType).parse(content, `fixtures/${name}`).parsedTexts];
}

function find(parsedTexts: ParsedText[], text: string): ParsedText {
  const found = parsedTexts.find((p) => p.text === text);
  if (!found) throw new Error(`Could not find parsed text: ${text}`);
  return found;
}

function findByRawText(parsedTexts: ParsedText[], rawText: string): ParsedText {
  const found = parsedTexts.find((p) => p.rawText === rawText);
  if (!found) throw new Error(`Could not find parsed text with rawText: ${rawText}`);
  return found;
}

describe('javascript parser', () => {
  it('is named "javascript", not "typescript"', () => {
    expect(parser.name).toBe('javascript');
  });

  it('parser.parse filters out code by default', () => {
    const content = 'const x = 1;\n';

    const raw = [...parse(content, 'file.js').parsedTexts];
    const filtered = [...parser.parse(content, 'file.js').parsedTexts];

    expect(raw.some((p) => p.tags?.code)).toBe(true);
    expect(filtered.some((p) => p.tags?.code)).toBe(false);
  });

  it('preserves the filename and full content on the result', () => {
    const content = readFixture('tags.js');
    const result = parser.parse(content, 'fixtures/tags.js');

    expect(result.filename).toBe('fixtures/tags.js');
    expect(result.content).toBe(content);
  });

  describe('tags.js', () => {
    const parsedTexts = parseFixture('tags.js');

    it('tags single- and double-quoted strings, same as the typescript parser', () => {
      const single = findByRawText(parsedTexts, "'hello'");
      const double = findByRawText(parsedTexts, '"hello"');
      expect(single.text).toBe('hello');
      expect(single.tags).toEqual({ string: true, 'string.singleQuote': true });
      expect(double.text).toBe('hello');
      expect(double.tags).toEqual({ string: true, 'string.doubleQuote': true });
    });

    it('tags template literal fragments and still walks embedded expressions', () => {
      expect(find(parsedTexts, 'hi ').tags).toEqual({ string: true, 'string.templateLiteral': true });
      expect(find(parsedTexts, 'userName').tags).toEqual({ identifier: true, 'identifier.variable': true });
    });

    it('tags line and doc-block comments', () => {
      expect(find(parsedTexts, 'leading comment').tags).toEqual({ comment: true, 'comment.line': true });
      expect(find(parsedTexts, 'doc comment').tags).toEqual({
        comment: true,
        'comment.block': true,
        'comment.block.doc': true,
      });
    });

    it('does not spell check keywords or punctuation', () => {
      expect(parsedTexts.some((p) => p.text === 'const')).toBe(false);
      expect(parsedTexts.some((p) => p.text === 'greeting')).toBe(true);
    });
  });

  it('parses jsx files with the javascriptreact parser and tags jsx text as jsx.text', () => {
    const parsedTexts = parseFixture('jsx.jsx', 'javascriptreact');

    expect(find(parsedTexts, 'hello world').tags).toEqual({ jsx: true, 'jsx.text': true });
    expect(find(parsedTexts, 'Greeting').tags).toEqual({ identifier: true, 'identifier.variable': true });
  });

  it('parses JSX in a .js file with the javascript parser', () => {
    const parsedTexts = parseFixture('jsx.jsx');
    expect(find(parsedTexts, 'hello world').tags).toEqual({ jsx: true, 'jsx.text': true });
  });

  it('only declares javascript file types as supported, not typescript', () => {
    expect(plugin.supportedFileTypes).toEqual(['javascript', 'javascriptreact']);
  });
});
