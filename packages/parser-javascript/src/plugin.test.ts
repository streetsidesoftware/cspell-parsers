import type { Parser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parser, supportedFileTypes as parserSupportedFileTypes } from './parser.ts';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

describe('plugin', () => {
  it('exposes the javascript parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('re-exports supportedFileTypes from the parser', () => {
    expect(supportedFileTypes).toBe(parserSupportedFileTypes);
  });

  it('is usable to parse JavaScript content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as Parser[];
    const result = pluginParser?.parse("const greeting = 'hello';\n", 'example.js');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'greeting')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the javascript parser', () => {
    const customized = customizePlugin({ tags: { '*': false, comment: true } });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];
    const result = customizedParser?.parse("// a comment\nconst greeting = 'hello';\n", 'example.js');
    const parsedTexts = [...(result?.parsedTexts ?? [])];

    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.text === 'greeting')).toBe(false);
  });

  it('wires name customization, including recommendedLanguageSettings, into the javascript parser', () => {
    const customized = customizePlugin({ name: 'custom-javascript', tags: {} });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];

    expect(customizedParser?.name).toBe('custom-javascript');
    expect(customized).toMatchObject({ recommendedLanguageSettings: [{ parser: 'custom-javascript' }] });
  });
});
