import { describe, expect, it } from 'vitest';

import { parser, supportedFileTypes as parserSupportedFileTypes } from './parser.js';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.js';
import type { Parser } from '@cspell/cspell-types';

describe('plugin', () => {
  it('exposes the typescript parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('re-exports supportedFileTypes from the parser', () => {
    expect(supportedFileTypes).toBe(parserSupportedFileTypes);
  });

  it('is usable to parse TypeScript content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as Parser[];
    const result = pluginParser?.parse("const greeting = 'hello';\n", 'example.ts');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'greeting')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the typescript parser', () => {
    const customized = customizePlugin({ tags: { '*': false, comment: true } });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];
    const result = customizedParser?.parse("// a comment\nconst greeting = 'hello';\n", 'example.ts');
    const parsedTexts = [...(result?.parsedTexts ?? [])];

    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.rawText === '// a comment')).toBe(true);
    expect(parsedTexts.some((p) => p.text === 'greeting')).toBe(false);
  });
});
