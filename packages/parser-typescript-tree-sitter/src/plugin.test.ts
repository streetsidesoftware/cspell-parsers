import type { Parser as CSpellParser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parser, supportedFileTypes as parserSupportedFileTypes } from './parser.ts';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

describe('plugin', () => {
  it('exposes the typescript parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('re-exports supportedFileTypes from the parser', () => {
    expect(supportedFileTypes).toBe(parserSupportedFileTypes);
  });

  it('is usable to parse TypeScript content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as CSpellParser[];
    const result = pluginParser?.parse("const greeting = 'hello';\n", 'example.ts');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'greeting')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the typescript parser', () => {
    const customized = customizePlugin({ tags: { '*': false, comment: true } });
    const [customizedParser] = (customized.parsers ?? []) as CSpellParser[];
    const result = customizedParser?.parse("// a comment\nconst greeting = 'hello';\n", 'example.ts');
    const parsedTexts = [...(result?.parsedTexts ?? [])];

    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.rawText === '// a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.text === 'greeting')).toBe(false);
  });

  it('keeps the catch-all `code` segments when they are explicitly included', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const [customizedParser] = (customized.parsers ?? []) as CSpellParser[];
    const result = customizedParser?.parse("// a comment\nconst greeting = 'hello';\n", 'example.ts');
    const parsedTexts = [...(result?.parsedTexts ?? [])];

    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(false);
    // Only `comment` is excluded, not everything - the "const "/"= "/";" `code` segments still come through
    // (`'*': true` overrides code's own default-off behavior), so this can't have filtered out everything.
    expect(parsedTexts.some((p) => p.tags?.code)).toBe(true);
  });

  it('wires name customization, including recommendedLanguageSettings, into the typescript parser', () => {
    const customized = customizePlugin({ name: 'custom-typescript', tags: {} });
    const [customizedParser] = (customized.parsers ?? []) as CSpellParser[];

    expect(customizedParser?.name).toBe('custom-typescript');
    expect(customized).toMatchObject({ recommendedLanguageSettings: [{ parser: 'custom-typescript' }] });
  });
});
