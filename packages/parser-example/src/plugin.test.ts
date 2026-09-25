import type { Parser as CSpellParser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parser, supportedFileTypes as parserSupportedFileTypes } from './parser.ts';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

describe('plugin', () => {
  it('exposes the c-style-comments parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('re-exports supportedFileTypes from the parser', () => {
    expect(supportedFileTypes).toBe(parserSupportedFileTypes);
  });

  it('is usable to parse content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as CSpellParser[];
    const result = pluginParser?.parse('// hello\n', 'example.c');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the c-style-comments parser', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const [customizedParser] = (customized.parsers ?? []) as CSpellParser[];
    const result = customizedParser?.parse('// hello\n', 'example.c');

    const parsedTexts = [...(result?.parsedTexts ?? [])];
    expect(parsedTexts.some((p) => p.text === 'hello')).toBe(false);
    // `'*': true` overrides code's default-off, so the trailing "\n" `code` segment still comes through.
    expect(parsedTexts.some((p) => p.tags?.code)).toBe(true);
  });

  it('renames the parser with renameParser, and languageSettings follow', () => {
    const customized = customizePlugin().renameParser('c-style-comments', 'custom-example');

    expect(customized.parserNames()).toEqual(['custom-example']);
    expect(customized.languageSettings()).toEqual([
      { languageId: supportedFileTypes.join(','), parser: 'custom-example' },
    ]);
  });

  it('returns a copy that can be customized further, leaving plugin unchanged', () => {
    const customized = customizePlugin().renameParser('c-style-comments', 'c-comments');

    expect(customized.parserNames()).toEqual(['c-comments']);
    expect(plugin.parserNames()).toEqual(['c-style-comments']);
  });
});
