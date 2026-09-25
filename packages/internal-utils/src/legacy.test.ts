import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { toLegacyPlugin } from './legacy.ts';
import { customizeParser } from './parser.ts';
import { createPluginParserWithFilterTags } from './parserEx.ts';
import { createPluginEx } from './pluginEx.ts';

const segments: ParsedText[] = [
  { text: 'comment', range: [0, 7], tags: { comment: true } },
  { text: 'code', range: [8, 12], tags: { code: true } },
];

const parser = createPluginParserWithFilterTags({
  name: 'p',
  parse: (content, filename) => ({ content, filename, parsedTexts: segments }),
  supportedFileTypes: ['a', 'b'],
  tags: { comment: true, code: false },
});

describe('toLegacyPlugin', () => {
  it('keeps the parsers, file types, and recommended settings', () => {
    const legacy = toLegacyPlugin(createPluginEx({ name: 'x', parsers: [parser] }));
    expect(legacy.name).toBe('x');
    expect(legacy.parsers.map((p) => p.name)).toEqual(['p']);
    expect(legacy.supportedFileTypes).toEqual(['a', 'b']);
    expect(legacy.recommendedLanguageSettings).toEqual([{ languageId: 'a,b', parser: 'p' }]);
  });

  it('keeps the current filter, and old-style customize re-filters from the unfiltered output', () => {
    const [legacyParser] = toLegacyPlugin(createPluginEx({ name: 'x', parsers: [parser] })).parsers;
    if (!legacyParser) throw new Error('missing parser');
    expect([...legacyParser.parse('', 'f').parsedTexts].map((t) => t.text)).toEqual(['comment']);
    const withCode = customizeParser(legacyParser, { tags: { code: true } });
    expect([...withCode.parse('', 'f').parsedTexts].map((t) => t.text)).toEqual(['comment', 'code']);
  });
});
