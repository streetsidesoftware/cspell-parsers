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
      'javascript-strings-comments',
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

  it('rejects the removed (fileType, options) form', () => {
    const call = customizePlugin as unknown as (fileType: string, options: object) => unknown;
    expect(() => call('csharp', { name: 'csharp-docs', tags: {} })).toThrow('filterTagsForFileType');
  });

  it('rejects the removed name option', () => {
    const options = { name: 'custom', tags: {} } as unknown as Parameters<typeof customizePlugin>[0];
    expect(() => customizePlugin(options)).toThrow(/renameParser/);
  });
});
