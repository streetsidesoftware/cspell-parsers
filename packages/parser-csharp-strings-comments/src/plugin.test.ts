import type { Parser as CSpellParser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parser, supportedFileTypes as parserSupportedFileTypes } from './parser.ts';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

describe('plugin', () => {
  it('exposes the csharp-strings-comments parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('re-exports supportedFileTypes from the parser', () => {
    expect(supportedFileTypes).toBe(parserSupportedFileTypes);
  });

  it('is usable to parse content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as CSpellParser[];
    const result = pluginParser?.parse('// hello\n', 'example.cs');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the csharp-strings-comments parser', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const [customizedParser] = (customized.parsers ?? []) as CSpellParser[];
    const result = customizedParser?.parse('// hello\n', 'example.cs');

    const parsedTexts = [...(result?.parsedTexts ?? [])];
    expect(parsedTexts.some((p) => p.text === 'hello')).toBe(false);
    // Only `comment` is excluded, not everything - the trailing "\n" `code` segment still comes through
    // (`'*': true` overrides code's own default-off behavior), so this can't have filtered out everything.
    expect(parsedTexts.some((p) => p.tags?.code)).toBe(true);
  });

  it('renames the parser with renameParser, and languageSettings follow', () => {
    const customized = customizePlugin().renameParser('csharp-strings-comments', 'custom-example');

    expect(customized.parserNames()).toEqual(['custom-example']);
    expect(customized.languageSettings()).toEqual([{ languageId: 'csharp', parser: 'custom-example' }]);
  });

  it('returns a copy that can be customized further, leaving plugin unchanged', () => {
    const customized = customizePlugin().renameParser('csharp-strings-comments', 'csharp-comments');

    expect(customized.parserNames()).toEqual(['csharp-comments']);
    expect(plugin.parserNames()).toEqual(['csharp-strings-comments']);
  });
});
