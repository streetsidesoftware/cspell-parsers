import { describe, expect, it } from 'vitest';

import { parser } from './parser.js';
import { plugin } from './plugin.js';

describe('plugin', () => {
  it('exposes the c-style-comments parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('is usable to parse content', () => {
    const [pluginParser] = plugin.parsers ?? [];
    const result = pluginParser?.parse('// hello\n', 'example.c');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === '// hello')).toBe(true);
  });
});
