import { describe, expect, it } from 'vitest';

import { parser } from './parser.js';
import { plugin } from './plugin.js';
import type { Parser } from '@cspell/cspell-types';

describe('plugin', () => {
  it('exposes the typescript parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('is usable to parse TypeScript content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as Parser[];
    const result = pluginParser?.parse("const greeting = 'hello';\n", 'example.ts');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'greeting')).toBe(true);
  });
});
