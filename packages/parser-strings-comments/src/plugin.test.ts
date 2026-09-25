import { describe, expect, it } from 'vitest';

import { customizePlugin, plugin, recommendedLanguageSettings, supportedFileTypes } from './plugin.ts';

const parse = (
  p: { getParser(name: string): { parse(c: string, f: string): { parsedTexts: Iterable<{ text: string }> } } },
  name: string,
  content: string,
  filename: string,
) => [...p.getParser(name).parse(content, filename).parsedTexts].map((t) => t.text);

describe('plugin', () => {
  it('bundles every language package parser, in order', () => {
    expect(plugin.parserNames()).toEqual([
      'c-cpp-strings-comments',
      'csharp-strings-comments',
      'go-strings-comments',
      'java-strings-comments',
      'php-strings-comments',
      'python-strings-comments',
      'ruby-strings-comments',
      'rust-strings-comments',
      'typescript-strings-comments',
    ]);
  });

  it('lists every bundled file type', () => {
    expect(supportedFileTypes).toEqual(expect.arrayContaining(['c', 'csharp', 'php', 'python', 'typescript']));
  });

  it('looks parsers up by file type with parserNamesFor', () => {
    expect(plugin.parserNamesFor('c')).toEqual(['c-cpp-strings-comments']);
  });

  it('is usable to parse content', () => {
    expect(parse(plugin, 'c-cpp-strings-comments', '// hello\n', 'example.c')).toContain('hello');
  });

  it('maps each file type to its language parser in recommendedLanguageSettings', () => {
    expect(recommendedLanguageSettings).toEqual(plugin.languageSettings());
    expect(recommendedLanguageSettings).toEqual(
      expect.arrayContaining([{ languageId: 'csharp', parser: 'csharp-strings-comments' }]),
    );
  });
});

describe('customizePlugin', () => {
  it('filters tags in every language', () => {
    const custom = customizePlugin({ tags: { '*': false, string: true } });

    expect(custom.parserNames()).toEqual(plugin.parserNames());
    expect(parse(custom, 'c-cpp-strings-comments', '// note\nx = "text";\n', 'a.c')).toEqual(['text']);
    expect(parse(custom, 'python-strings-comments', '# note\nx = "text"\n', 'a.py')).toEqual(['text']);
  });

  it('returns a copy that can be customized further, leaving plugin unchanged', () => {
    const custom = customizePlugin().filterTagsForFileType('csharp', { '*': false, comment: true }, 'csharp-comments');

    expect(custom.parserNamesFor('csharp')).toEqual(['csharp-strings-comments', 'csharp-comments']);
    expect(plugin.parserNamesFor('csharp')).toEqual(['csharp-strings-comments']);
  });

  it('throws for the deprecated name option, since the bundle has several parsers', () => {
    expect(() => customizePlugin({ name: 'custom', tags: {} })).toThrow(/renameParser/);
  });

  describe('deprecated (fileType, options) form', () => {
    it('keeps only the parsers for fileType, narrowed to it, and renames them', () => {
      const custom = customizePlugin('csharp', { name: 'csharp-docs', tags: { '*': false, comment: true } });

      expect(custom.name).toBe('csharp-docs');
      expect(custom.languageSettings()).toEqual([{ languageId: 'csharp', parser: 'csharp-docs' }]);
      expect(parse(custom, 'csharp-docs', '// note\nvar x = "text";\n', 'a.cs')).toEqual(['note']);
    });

    it('narrows a parser that lists several file types to just fileType', () => {
      const custom = customizePlugin('cpp', { tags: {} });

      expect(custom.languageSettings()).toEqual([{ languageId: 'cpp', parser: 'c-cpp-strings-comments' }]);
    });

    it("keeps every parser for '*', and names only the plugin", () => {
      const custom = customizePlugin('*', { name: 'custom', tags: { '*': false, comment: true } });

      expect(custom.name).toBe('custom');
      expect(custom.parserNames()).toEqual(plugin.parserNames());
      expect(parse(custom, 'go-strings-comments', '// note\nx := "text"\n', 'a.go')).toEqual(['note']);
    });
  });
});
