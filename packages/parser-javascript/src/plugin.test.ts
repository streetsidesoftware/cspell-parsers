import { plugin as typescriptPlugin } from '@cspell/parser-typescript/plugin';
import { describe, expect, it } from 'vitest';

import { customizePlugin, plugin } from './plugin.ts';

describe('plugin', () => {
  it("has parser-typescript's javascript and javascriptreact parsers, the same objects", () => {
    expect(plugin.parserNames()).toEqual(['javascript', 'javascriptreact']);
    expect(plugin.getParser('javascript')).toBe(typescriptPlugin.getParser('javascript'));
    expect(plugin.getParser('javascriptreact')).toBe(typescriptPlugin.getParser('javascriptreact'));
  });
});

describe('customizePlugin', () => {
  it('applies the tag filter to both parsers', () => {
    const customized = customizePlugin({ tags: { '*': false, comment: true } });

    for (const name of customized.parserNames()) {
      const parsedTexts = [
        ...customized.getParser(name).parse("// a comment\nconst greeting = 'hello';\n", 'x').parsedTexts,
      ];
      expect(parsedTexts.map((p) => p.text)).toEqual(['a comment']);
    }
  });
});
