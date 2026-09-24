import type { Parser } from '@cspell/cspell-types';
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
    const [pluginParser] = (plugin.parsers ?? []) as Parser[];
    const result = pluginParser?.parse('// hello\n', 'example.cs');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the csharp-strings-comments parser', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];
    const result = customizedParser?.parse('// hello\n', 'example.cs');

    const parsedTexts = [...(result?.parsedTexts ?? [])];
    expect(parsedTexts.some((p) => p.text === 'hello')).toBe(false);
    // Only `comment` is excluded, not everything - the trailing "\n" `code` segment still comes through
    // (`'*': true` overrides code's own default-off behavior), so this can't have filtered out everything.
    expect(parsedTexts.some((p) => p.tags?.code)).toBe(true);
  });

  it('wires name customization, including recommendedLanguageSettings, into the csharp-strings-comments parser', () => {
    const customized = customizePlugin({ name: 'custom-example', tags: {} });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];

    expect(customizedParser?.name).toBe('custom-example');
    expect(customized).toMatchObject({ recommendedLanguageSettings: [{ parser: 'custom-example' }] });
  });
});
