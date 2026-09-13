import type { ParsedText, Parser, ParseResult, Plugin } from '@cspell/cspell-types';

/**
 * Matches a leading YAML front-matter block, e.g.:
 * ---
 * title: Example
 * ---
 */
const frontMatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export function parse(content: string, filename: string): ParseResult {
  const match = frontMatterPattern.exec(content);
  const bodyStart = match ? match[0].length : 0;

  const parsedTexts: ParsedText[] = [
    {
      text: content.slice(bodyStart),
      range: [bodyStart, content.length],
    },
  ];

  return { content, filename, parsedTexts };
}

export const parser: Parser = {
  name: 'front-matter-example',
  parse,
};

export const plugin: Plugin = {
  parsers: [parser],
};

export default plugin;
