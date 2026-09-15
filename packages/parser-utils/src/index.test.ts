import type { ParsedText, Parser, Plugin } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { customizeParser, customizePlugin } from './index.js';

function mkText(content: string, tags: ParsedText['tags']): ParsedText {
  return { text: content, range: [0, content.length], tags };
}

function fakeParser(parsedTexts: ParsedText[]): Parser {
  return {
    name: 'fake',
    parse: (content, filename) => ({ content, filename, parsedTexts }),
  };
}

describe('customizeParser', () => {
  it('validates everything by default (no validate keys at all)', () => {
    const parsedTexts = [mkText('a', { comment: true }), mkText('b', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), {});
    expect([...parser.parse('', 'f').parsedTexts]).toEqual(parsedTexts);
  });

  it('"*": false excludes everything not otherwise matched', () => {
    const parsedTexts = [mkText('a', { comment: true }), mkText('b', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), { '*': false });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([]);
  });

  it('an exact tag key overrides the "*" default', () => {
    const parsedTexts = [mkText('a', { string: true }), mkText('b', { comment: true }), mkText('c', undefined)];
    const parser = customizeParser(fakeParser(parsedTexts), { '*': false, string: true });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([parsedTexts[0]]);
  });

  it('a broader key matches a more specific tag hierarchically', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const parser = customizeParser(fakeParser([docComment]), { '*': false, comment: true });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('a more specific key overrides a broader key for the same segment', () => {
    const blockComment = mkText('a', { comment: true, 'comment.block': true });
    const docComment = mkText('b', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const validate = { '*': true, 'comment.block': false, 'comment.block.doc': true };
    const parser = customizeParser(fakeParser([blockComment, docComment]), validate);
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('supports trailing wildcard patterns like "comment.block.*"', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const lineComment = mkText('b', { comment: true, 'comment.line': true });
    const validate = { '*': false, 'comment.block.*': true };
    const parser = customizeParser(fakeParser([docComment, lineComment]), validate);
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('supports prefix wildcard patterns like "comment*"', () => {
    const docComment = mkText('a', { comment: true, 'comment.block': true, 'comment.block.doc': true });
    const identifier = mkText('b', { identifier: true, 'identifier.variable': true });
    const validate = { '*': false, 'comment*': true };
    const parser = customizeParser(fakeParser([docComment, identifier]), validate);
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([docComment]);
  });

  it('ignores tags explicitly set to false when deciding which tags a segment "has"', () => {
    const parsedTexts = [mkText('a', { comment: false })];
    const parser = customizeParser(fakeParser(parsedTexts), { '*': false, comment: true });
    expect([...parser.parse('', 'f').parsedTexts]).toEqual([]);
  });

  it('preserves other ParseResult fields', () => {
    const parser = customizeParser(fakeParser([]), {});
    const result = parser.parse('content', 'file.ts');
    expect(result.content).toBe('content');
    expect(result.filename).toBe('file.ts');
  });
});

describe('customizePlugin', () => {
  it('wraps every parser in the plugin', () => {
    const kept = mkText('a', { string: true });
    const dropped = mkText('b', { comment: true });
    const plugin: Plugin = { parsers: [fakeParser([kept, dropped])] };

    const customized = customizePlugin(plugin, { '*': false, string: true });
    const [parser] = customized.parsers ?? [];
    expect(parser).toBeDefined();
    expect('parse' in (parser as Parser) ? [...(parser as Parser).parse('', 'f').parsedTexts] : undefined).toEqual([
      kept,
    ]);
  });

  it('passes through plugins with no parsers', () => {
    const plugin: Plugin = { name: 'empty' };
    expect(customizePlugin(plugin, {})).toEqual(plugin);
  });
});
