import type { Parser as CSpellParser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parser, supportedFileTypes as parserSupportedFileTypes } from './parser.ts';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

describe('plugin', () => {
  it('exposes the python-strings-comments parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('re-exports supportedFileTypes from the parser', () => {
    expect(supportedFileTypes).toBe(parserSupportedFileTypes);
  });

  it('is usable to parse content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as CSpellParser[];
    const result = pluginParser?.parse('# hello\n', 'example.py');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the python-strings-comments parser', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const [customizedParser] = (customized.parsers ?? []) as CSpellParser[];
    const result = customizedParser?.parse('# hello\n', 'example.py');

    const parsedTexts = [...(result?.parsedTexts ?? [])];
    expect(parsedTexts.some((p) => p.text === 'hello')).toBe(false);
    // Only `comment` is excluded, not everything - the trailing "\n" `code` segment still comes through
    // (`'*': true` overrides code's own default-off behavior), so this can't have filtered out everything.
    expect(parsedTexts.some((p) => p.tags?.code)).toBe(true);
  });

  it('renames the parser with the deprecated name option, and languageSettings follow', () => {
    const customized = customizePlugin({ name: 'custom-example', tags: {} });

    expect(customized.parserNames()).toEqual(['custom-example']);
    expect(customized.languageSettings()).toEqual([{ languageId: 'python', parser: 'custom-example' }]);
  });

  it('returns a copy that can be customized further, leaving plugin unchanged', () => {
    const customized = customizePlugin().renameParser('python-strings-comments', 'python-comments');

    expect(customized.parserNames()).toEqual(['python-comments']);
    expect(plugin.parserNames()).toEqual(['python-strings-comments']);
  });
});
