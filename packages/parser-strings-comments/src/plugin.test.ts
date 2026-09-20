import type { Parser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { getParsersByFileType, plugin, customizePlugin } from './plugin.js';

describe('plugin', () => {
  it('exposes the strings-comments parser', () => {
    expect(plugin.parsers.map((p) => p.name)).toEqual(expect.arrayContaining(['typescript-strings-comments']));
  });

  it('exposes the the supported file types', () => {
    expect(plugin.supportedFileTypes).toEqual(expect.arrayContaining(['typescript']));
  });

  it('is usable to parse content', () => {
    const [pluginParser] = getParsersByFileType('c').slice(-1);
    const result = pluginParser?.parse('// hello\n', 'example.c');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('customizes the plugin with a new name', () => {
    const custom = customizePlugin('*', { name: 'custom-typescript-strings-comments', tags: { '*': false } });
    expect(custom.name).toBe('custom-typescript-strings-comments');
    expect(custom.parsers.map((p) => p.name)).toEqual(plugin.parsers.map((p) => p.name));
  });
});
