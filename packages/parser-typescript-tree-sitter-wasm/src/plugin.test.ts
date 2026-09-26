import { describe, expect, it } from 'vitest';

import { parsers } from './parsers.ts';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

const content = "// a comment\nconst greeting = 'hello';\n";

function texts(fileType: string, source = content): string[] {
  return [...plugin.getParser(fileType).parse(source, 'example').parsedTexts].map((p) => p.text);
}

describe('plugin', () => {
  it('exposes one parser per file type', () => {
    expect(plugin.parsers).toEqual(parsers);
    expect(plugin.supportedFileTypes).toEqual(['javascript', 'javascriptreact', 'typescript', 'typescriptreact']);
  });

  it('is usable to parse content with every parser', () => {
    for (const name of plugin.parserNames()) {
      expect(texts(name)).toContain('greeting');
    }
  });
});

describe('supportedFileTypes', () => {
  it("lists the plugin's file types", () => {
    expect(supportedFileTypes).toEqual(plugin.supportedFileTypes);
    expect([...supportedFileTypes].sort()).toEqual(['javascript', 'javascriptreact', 'typescript', 'typescriptreact']);
  });
});

describe('customizePlugin', () => {
  it('applies the tag filter to every parser', () => {
    const customized = customizePlugin({ tags: { '*': false, comment: true } });

    for (const name of customized.parserNames()) {
      const parsedTexts = [...customized.getParser(name).parse(content, 'example').parsedTexts];
      expect(parsedTexts.map((p) => p.text)).toEqual(['a comment']);
    }
  });

  it('checks JSX text by default, and skips it with jsx.text: false', () => {
    const source = 'const App = () => <p>hello world</p>;\n';
    const skipped = customizePlugin({ tags: { 'jsx.text': false } }).getParser('javascriptreact');

    expect(texts('javascriptreact', source)).toContain('hello world');
    expect([...skipped.parse(source, 'example.jsx').parsedTexts].map((p) => p.text)).not.toContain('hello world');
  });

  it('keeps the catch-all `code` segments when they are explicitly included', () => {
    const customized = customizePlugin({ tags: { '*': true, comment: false } });
    const parsedTexts = [...customized.getParser('typescript').parse(content, 'example.ts').parsedTexts];

    expect(parsedTexts.some((p) => p.text === 'a comment')).toBe(false);
    expect(parsedTexts.some((p) => p.tags?.code)).toBe(true);
  });

  it('returns a copy that can be customized further, leaving plugin unchanged', () => {
    const customized = customizePlugin().filterTagsForFileType(
      'javascript',
      { '*': false, comment: true },
      'js-comments',
    );

    expect(customized.parserNames()).toContain('js-comments');
    expect(plugin.parserNames()).not.toContain('js-comments');
  });

  it('rejects the removed name option', () => {
    const options = { name: 'custom', tags: {} } as unknown as Parameters<typeof customizePlugin>[0];
    expect(() => customizePlugin(options)).toThrow('use renameParser instead');
  });
});
