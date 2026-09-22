import type { Parser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parser, supportedFileTypes as parserSupportedFileTypes } from './parser.js';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.js';

describe('plugin', () => {
  it('exposes the c-cpp-strings-comments parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('re-exports supportedFileTypes from the parser', () => {
    expect(supportedFileTypes).toBe(parserSupportedFileTypes);
  });

  it('is usable to parse content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as Parser[];
    const result = pluginParser?.parse('// hello\n', 'example.c');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the c-cpp-strings-comments parser', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];
    const result = customizedParser?.parse('// hello\n', 'example.c');

    // Only `comment` is excluded, so the trailing "\n" `code` segment still comes through (`'*': true`
    // overrides code's own default-off behavior) - check that the comment text is gone rather than
    // asserting an empty result.
    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(false);
  });

  it('wires name customization into the c-cpp-strings-comments parser', () => {
    const customized = customizePlugin({ name: 'custom-example', tags: {} });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];

    expect(customizedParser?.name).toBe('custom-example');
  });
});
