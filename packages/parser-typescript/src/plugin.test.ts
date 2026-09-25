import { plugin as wasmPlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';
import { describe, expect, it } from 'vitest';

import { customizePlugin, plugin } from './plugin.ts';

describe('plugin', () => {
  it("uses the wasm backend's parsers, one per file type", () => {
    expect(plugin.parsers).toEqual(wasmPlugin.parsers);
    for (const [i, parser] of plugin.parsers.entries()) expect(parser).toBe(wasmPlugin.parsers[i]);
    expect(plugin.parserNames()).toEqual(['javascript', 'javascriptreact', 'typescript', 'typescriptreact']);
  });

  it('is usable to parse content', () => {
    const parsedTexts = [
      ...plugin.getParser('typescript').parse("const greeting = 'hello';\n", 'example.ts').parsedTexts,
    ];
    expect(parsedTexts.some((p) => p.text === 'greeting')).toBe(true);
  });
});

describe('customizePlugin', () => {
  it('applies the tag filter to every parser', () => {
    const customized = customizePlugin({ tags: { '*': false, comment: true } });

    for (const name of customized.parserNames()) {
      const parsedTexts = [
        ...customized.getParser(name).parse("// a comment\nconst greeting = 'hello';\n", 'x').parsedTexts,
      ];
      expect(parsedTexts.map((p) => p.text)).toEqual(['a comment']);
    }
  });

  it('rejects the old name option, since one name cannot cover every parser', () => {
    const options = { name: 'custom', tags: {} } as unknown as Parameters<typeof customizePlugin>[0];
    expect(() => customizePlugin(options)).toThrow('"name" only works for a plugin with one parser');
  });
});
