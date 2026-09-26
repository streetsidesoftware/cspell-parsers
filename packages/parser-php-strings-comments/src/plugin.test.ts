import type { Parser as CSpellParser } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { parsers, supportedFileTypes as parserSupportedFileTypes } from './parsers.ts';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

describe('plugin', () => {
  it('exposes the php-strings-comments parser', () => {
    expect(plugin.parsers).toEqual(parsers);
  });

  it('lists the supported file types of its parser', () => {
    expect(supportedFileTypes).toEqual(parserSupportedFileTypes);
  });

  it('is usable to parse content', () => {
    const [pluginParser] = (plugin.parsers ?? []) as CSpellParser[];
    const result = pluginParser?.parse('<?php // hello\n', 'example.php');

    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('keeps html once opted into, still leaving code off', () => {
    const customized = customizePlugin({ tags: { html: true } });
    const content = '<p>markup</p>\n<?php\n$x = 1; // a comment\n';
    const parsedTexts = [...customized.getParser('php-strings-comments').parse(content, 'file.php').parsedTexts];

    expect(parsedTexts.some((p) => p.tags?.html)).toBe(true);
    expect(parsedTexts.some((p) => p.tags?.code)).toBe(false);
  });

  it('wires tag filtering into the php-strings-comments parser', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const [customizedParser] = (customized.parsers ?? []) as CSpellParser[];
    const result = customizedParser?.parse('<?php // hello\n', 'example.php');

    // Only `comment` is excluded, so the surrounding "<?php " / "\n" `code` segments still come through -
    // check that the comment text is gone rather than asserting an empty result.
    expect([...(result?.parsedTexts ?? [])].some((p) => p.text === 'hello')).toBe(false);
  });

  it('renames the parser with renameParser, and languageSettings follow', () => {
    const customized = customizePlugin().renameParser('php-strings-comments', 'custom-example');

    expect(customized.parserNames()).toEqual(['custom-example']);
    expect(customized.languageSettings()).toEqual([{ languageId: 'php', parser: 'custom-example' }]);
  });

  it('returns a copy that can be customized further, leaving plugin unchanged', () => {
    const customized = customizePlugin().renameParser('php-strings-comments', 'php-comments');

    expect(customized.parserNames()).toEqual(['php-comments']);
    expect(plugin.parserNames()).toEqual(['php-strings-comments']);
  });
});
