import { plugin as typescriptPlugin } from '@cspell/parser-typescript/plugin';
import { describe, expect, it } from 'vitest';

import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

describe('plugin', () => {
  it("has parser-typescript's javascript and javascriptreact parsers, the same objects", () => {
    expect(plugin.parserNames()).toEqual(['javascript', 'javascriptreact']);
    expect(plugin.getParser('javascript')).toBe(typescriptPlugin.getParser('javascript'));
    expect(plugin.getParser('javascriptreact')).toBe(typescriptPlugin.getParser('javascriptreact'));
  });
});

describe('supportedFileTypes', () => {
  it("lists the plugin's file types", () => {
    expect(supportedFileTypes).toEqual(plugin.supportedFileTypes);
    expect([...supportedFileTypes].sort()).toEqual(['javascript', 'javascriptreact']);
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

  it('rejects the removed name option', () => {
    const options = { name: 'custom', tags: {} } as unknown as Parameters<typeof customizePlugin>[0];
    expect(() => customizePlugin(options)).toThrow('use renameParser instead');
  });
});
