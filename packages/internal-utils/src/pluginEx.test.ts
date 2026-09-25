import type { AdvancedCSpellSettings, ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { createPluginParserWithFilterTags } from './parserEx.ts';
import { createPluginEx } from './pluginEx.ts';
import type { IParserEx, IPluginEx } from './types.ts';

const segments: ParsedText[] = [
  { text: 'comment', range: [0, 7], tags: { comment: true } },
  { text: 'string', range: [8, 14], tags: { string: true } },
  { text: 'code', range: [15, 19], tags: { code: true } },
];

function mkParser(name: string, supportedFileTypes: string[]): IParserEx {
  return createPluginParserWithFilterTags({
    name,
    parse: (content, filename) => ({ content, filename, parsedTexts: segments }),
    supportedFileTypes,
    tags: { comment: true, string: true, code: false },
  });
}

function texts(parser: IParserEx): string[] {
  return [...parser.parse('', 'file').parsedTexts].map((t) => t.text);
}

function mkPlugin(): IPluginEx {
  return createPluginEx({
    name: 'test',
    parsers: [mkParser('typescript', ['javascript', 'typescript']), mkParser('php', ['php'])],
  });
}

describe('createPluginParserWithFilterTags', () => {
  it('applies the defaults from tags and keeps the unfiltered _parse', () => {
    const parser = mkParser('p', ['a']);
    expect(texts(parser)).toEqual(['comment', 'string']);
    expect([...parser._parse('', 'file').parsedTexts]).toEqual(segments);
    expect(parser.filterTags).toBeUndefined();
    expect(Object.isFrozen(parser)).toBe(true);
  });
});

describe('createPluginEx', () => {
  it('rejects duplicate parser names', () => {
    expect(() => createPluginEx({ name: 'test', parsers: [mkParser('a', []), mkParser('a', [])] })).toThrow(
      'Parser name "a" is already used in plugin "test".',
    );
  });

  it('derives supportedFileTypes from its parsers', () => {
    expect(mkPlugin().supportedFileTypes).toEqual(['javascript', 'typescript', 'php']);
  });

  it('returns a new parsers array on each read, so the plugin cannot be changed through it', () => {
    const plugin = mkPlugin();
    plugin.parsers.pop();
    expect(plugin.parsers.map((p) => p.name)).toEqual(['typescript', 'php']);
  });

  it('getParser throws on an unknown name and lists the available ones', () => {
    const plugin = mkPlugin();
    expect(plugin.hasParser('php')).toBe(true);
    expect(plugin.hasParser('go')).toBe(false);
    expect(() => plugin.getParser('go')).toThrow(
      'Unknown parser "go" in plugin "test". Available parsers: "typescript", "php".',
    );
  });

  it('customize() leaves the original plugin unchanged', () => {
    const plugin = mkPlugin();
    plugin.customize().removeParser('*');
    expect(plugin.parsers.map((p) => p.name)).toEqual(['typescript', 'php']);
  });
});

describe('languageSettings', () => {
  it('maps each file type to the last parser that lists it', () => {
    const b = mkPlugin()
      .customize()
      .duplicateParser('typescript', 'js-comments')
      .setFileTypes('js-comments', ['javascript']);
    expect(b.languageSettings()).toEqual([
      { languageId: 'typescript', parser: 'typescript' },
      { languageId: 'php', parser: 'php' },
      { languageId: 'javascript', parser: 'js-comments' },
    ]);
  });

  it('languageSettingsFor uses the parser file types by default, or any given ones', () => {
    const plugin = mkPlugin();
    expect(plugin.languageSettingsFor('typescript')).toEqual([
      { languageId: 'javascript,typescript', parser: 'typescript' },
    ]);
    expect(plugin.languageSettingsFor('typescript', ['astro'])).toEqual([
      { languageId: 'astro', parser: 'typescript' },
    ]);
    expect(() => plugin.languageSettingsFor('go', ['go'])).toThrow('Unknown parser "go"');
  });

  it('languageSettingsFor accepts a list of names or "*", each file type going to the last targeted parser', () => {
    const b = mkPlugin().customize().duplicateParser('typescript', 'ts2').setFileTypes('ts2', ['typescript']);
    expect(b.languageSettingsFor('*')).toEqual(b.languageSettings());
    expect(b.languageSettingsFor(['ts2', 'typescript'])).toEqual([
      { languageId: 'javascript', parser: 'typescript' },
      { languageId: 'typescript', parser: 'ts2' },
    ]);
    expect(b.languageSettingsFor('typescript')).toEqual([
      { languageId: 'javascript,typescript', parser: 'typescript' },
    ]);
    expect(b.languageSettingsFor([])).toEqual([]);
  });

  it('languageSettingsFor only takes explicit fileTypes with a single name', () => {
    const plugin = mkPlugin();
    expect(() => plugin.languageSettingsFor('*', ['astro'])).toThrow('Explicit fileTypes need a single parser name.');
  });

  it('languageSettingsForFileType maps only the requested file types, each to the last parser that lists it', () => {
    const b = mkPlugin().customize().duplicateParser('typescript', 'ts2').setFileTypes('ts2', ['typescript']);
    expect(b.languageSettingsForFileType('javascript')).toEqual([{ languageId: 'javascript', parser: 'typescript' }]);
    expect(b.languageSettingsForFileType(['typescript', 'php', 'javascript'])).toEqual([
      { languageId: 'javascript', parser: 'typescript' },
      { languageId: 'php', parser: 'php' },
      { languageId: 'typescript', parser: 'ts2' },
    ]);
    expect(b.languageSettingsForFileType('*')).toEqual(b.languageSettings());
    expect(b.languageSettingsForFileType([])).toEqual([]);
  });

  it('languageSettingsForFileType throws on a file type no parser lists', () => {
    expect(() => mkPlugin().languageSettingsForFileType(['astro', 'php'])).toThrow(
      'No parser in plugin "test" lists file type "astro". Supported file types: javascript, typescript, php.',
    );
  });

  it('parserNamesFor lists every parser for a file type, in order', () => {
    const b = mkPlugin().customize().duplicateParser('typescript', 'ts2');
    expect(b.parserNamesFor('typescript')).toEqual(['typescript', 'ts2']);
    expect(b.parserNamesFor('go')).toEqual([]);
  });
});

describe('IPluginBuilder', () => {
  it('changes itself in place and returns itself', () => {
    const b = mkPlugin().customize();
    expect(b.removeParser('php')).toBe(b);
    expect(b.parsers.map((p) => p.name)).toEqual(['typescript']);
  });

  it('duplicateParser copies the current state and appends the copy', () => {
    const b = mkPlugin()
      .customize()
      .filterTags('typescript', { '*': false, comment: true })
      .duplicateParser('typescript', 'copy');
    expect(b.parsers.map((p) => p.name)).toEqual(['typescript', 'php', 'copy']);
    expect(texts(b.getParser('copy'))).toEqual(['comment']);
    expect(b.getParser('copy').supportedFileTypes).toEqual(['javascript', 'typescript']);
  });

  it('renameParser keeps the position', () => {
    const b = mkPlugin().customize().renameParser('typescript', 'ts');
    expect(b.parsers.map((p) => p.name)).toEqual(['ts', 'php']);
  });

  it('throws when a name is already taken, or unknown, or "*"', () => {
    const b = mkPlugin().customize();
    expect(() => b.duplicateParser('typescript', 'php')).toThrow('Parser name "php" is already used');
    expect(() => b.renameParser('typescript', 'php')).toThrow('Parser name "php" is already used');
    expect(() => b.addParser(mkParser('php', []))).toThrow('Parser name "php" is already used');
    expect(() => b.duplicateParser('typescript', '*')).toThrow('Invalid parser name "*"');
    expect(() => b.filterTags('typscript', {})).toThrow('Unknown parser "typscript"');
  });

  it('names every unknown parser in the error', () => {
    const b = mkPlugin().customize();
    expect(() => b.removeParser(['go', 'rust'])).toThrow('Unknown parsers "go", "rust" in plugin "test".');
  });

  it('parserNames lists the names in order, ready to use as a target', () => {
    const b = mkPlugin().customize().duplicateParser('php', 'php2');
    expect(b.parserNames()).toEqual(['typescript', 'php', 'php2']);
    b.filterTags(b.parserNames(), { '*': false, comment: true });
    expect(texts(b.getParser('php2'))).toEqual(['comment']);
  });

  it('customize() forks a builder, leaving the original unchanged', () => {
    const a = mkPlugin().customize().addFileTypes('typescript', ['astro']);
    const b = a.customize().filterTags('*', { '*': false, comment: true });
    for (const name of b.parserNames()) b.renameParser(name, 'legacy.' + name);

    expect(a.parserNames()).toEqual(['typescript', 'php']);
    expect(texts(a.getParser('php'))).toEqual(['comment', 'string']);
    expect(b.parserNames()).toEqual(['legacy.typescript', 'legacy.php']);
    expect(b.getParser('legacy.typescript').supportedFileTypes).toEqual(['javascript', 'typescript', 'astro']);
    expect(texts(b.getParser('legacy.php'))).toEqual(['comment']);
  });

  it('checks every name in a target list before changing anything', () => {
    const b = mkPlugin().customize();
    expect(() => b.removeParser(['php', 'go'])).toThrow('Unknown parser "go"');
    expect(b.parsers.map((p) => p.name)).toEqual(['typescript', 'php']);
  });

  it('accepts a list of names, "*", or an empty list', () => {
    const b = mkPlugin().customize();
    b.filterTags(b.parserNamesFor('php'), { '*': false, string: true });
    expect(texts(b.getParser('php'))).toEqual(['string']);
    b.filterTags([], { '*': false });
    b.removeParser('*');
    expect(b.parsers).toEqual([]);
    expect(() => b.filterTags('*', {})).not.toThrow();
  });

  it('adds, removes, and sets file types without removing parsers', () => {
    const b = mkPlugin().customize();
    b.addFileTypes('php', ['phtml', 'php']);
    expect(b.getParser('php').supportedFileTypes).toEqual(['php', 'phtml']);
    b.removeFileTypes('*', ['php', 'phtml', 'javascript']);
    expect(b.getParser('php').supportedFileTypes).toEqual([]);
    expect(b.parsers.map((p) => p.name)).toEqual(['typescript', 'php']);
    b.setFileTypes('php', ['hack']);
    expect(b.supportedFileTypes).toEqual(['typescript', 'hack']);
  });

  it('build() takes a snapshot that later changes do not affect', () => {
    const b = mkPlugin().customize();
    const snapshot = b.build();
    b.removeParser('php');
    expect(snapshot.parsers.map((p) => p.name)).toEqual(['typescript', 'php']);
  });

  it('is usable directly as a cspell plugin', () => {
    const b = mkPlugin().customize();
    const settings: AdvancedCSpellSettings = { plugins: [b], languageSettings: b.languageSettings() };
    expect(settings.plugins).toHaveLength(1);
  });
});

describe('filterTags', () => {
  it('replaces the filter instead of chaining, so a default-off tag can be turned on', () => {
    const b = mkPlugin()
      .customize()
      .filterTags('*', { '*': false, comment: true })
      .filterTags('typescript', { code: true });
    expect(texts(b.getParser('typescript'))).toEqual(['comment', 'string', 'code']);
    expect(texts(b.getParser('php'))).toEqual(['comment']);
  });

  it('{} resets to the defaults from tags', () => {
    const b = mkPlugin().customize().filterTags('php', { '*': false }).filterTags('php', {});
    expect(texts(b.getParser('php'))).toEqual(['comment', 'string']);
    expect(b.getParser('php').filterTags).toBeUndefined();
  });

  it('carries the filter with the parser, and re-filters from the unfiltered output', () => {
    const commentsOnly = mkPlugin().customize().filterTags('*', { '*': false, comment: true }).build();
    const parser = commentsOnly.getParser('php');
    expect(parser.filterTags).toEqual({ '*': false, comment: true });

    const b = createPluginEx({ name: 'other', parsers: [] }).customize().addParser(parser, 'php-comments');
    expect(texts(b.getParser('php-comments'))).toEqual(['comment']);

    b.filterTags('php-comments', { code: true });
    expect(texts(b.getParser('php-comments'))).toEqual(['comment', 'string', 'code']);
  });
});

// cspell:ignore typscript
