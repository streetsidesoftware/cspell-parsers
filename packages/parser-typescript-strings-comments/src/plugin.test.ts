import { describe, expect, it } from 'vitest';

import { parsers } from './parsers.ts';
import { customizePlugin, plugin, supportedFileTypes } from './plugin.ts';

function texts(p: typeof plugin, name: string, content: string, filename: string): string[] {
  return [...p.getParser(name).parse(content, filename).parsedTexts].map((t) => t.text);
}

describe('plugin', () => {
  it('exposes the javascript and typescript parsers', () => {
    expect(plugin.parsers).toEqual(parsers);
    expect(plugin.parserNames()).toEqual(['javascript-strings-comments', 'typescript-strings-comments']);
  });

  it('lists every supported file type', () => {
    expect(supportedFileTypes).toEqual(['javascript', 'javascriptreact', 'typescript', 'typescriptreact']);
  });

  it('selects each parser for its own file types', () => {
    expect(plugin.parserNamesFor('javascriptreact')).toEqual(['javascript-strings-comments']);
    expect(plugin.parserNamesFor('typescriptreact')).toEqual(['typescript-strings-comments']);
  });

  it('is usable to parse content with either parser', () => {
    for (const name of plugin.parserNames()) {
      expect(texts(plugin, name, '// hello\n', 'example')).toContain('hello');
    }
  });
});

describe('customizePlugin', () => {
  it('applies the tag filter to both parsers', () => {
    const customized = customizePlugin({ tags: { '*': false, string: true } });
    for (const name of customized.parserNames()) {
      expect(texts(customized, name, '// note\nconst s = "text";\n', 'example')).toEqual(['text']);
    }
  });

  it('rejects the old name option, since one name cannot cover both parsers', () => {
    const options = { name: 'custom', tags: {} } as unknown as Parameters<typeof customizePlugin>[0];
    expect(() => customizePlugin(options)).toThrow(/renameParser/);
  });

  it('returns a builder that can be customized further, leaving plugin unchanged', () => {
    const customized = customizePlugin().renameParser('typescript-strings-comments', 'ts-comments');

    expect(customized.parserNames()).toEqual(['javascript-strings-comments', 'ts-comments']);
    expect(plugin.parserNames()).toEqual(['javascript-strings-comments', 'typescript-strings-comments']);
  });
});
