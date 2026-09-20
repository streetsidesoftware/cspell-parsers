import type { Parser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parser, supportedFileTypes as parserSupportedFileTypes } from './parser.js';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.js';

describe('plugin', () => {
  it('exposes the php-strings-comments parser', () => {
    expect(plugin.parsers).toEqual([parser]);
  });

  it('re-exports supportedFileTypes from the parser', () => {
    expect(supportedFileTypes).toBe(parserSupportedFileTypes);
  });

  it('is usable to parse content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as Parser[];
    const result = pluginParser?.parse('<?php // hello\n', 'example.php');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('wires tag filtering into the php-strings-comments parser', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];
    const result = customizedParser?.parse('<?php // hello\n', 'example.php');

    expect([...(result?.parsedTexts ?? [])]).toEqual([]);
  });

  it('wires name customization into the php-strings-comments parser', () => {
    const customized = customizePlugin({ name: 'custom-example', tags: {} });
    const [customizedParser] = (customized.parsers ?? []) as Parser[];

    expect(customizedParser?.name).toBe('custom-example');
  });
});
