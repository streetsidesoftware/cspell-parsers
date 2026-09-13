import { describe, expect, it } from 'vitest';

import { parser } from './index.js';

describe('front-matter-example parser', () => {
  it('excludes a leading YAML front-matter block from the parsed text', () => {
    const content = '---\ntitle: Exampel\n---\nHello wrold\n';

    const result = parser.parse(content, 'example.md');
    const [parsedText] = [...result.parsedTexts];

    expect(parsedText.text).toBe('Hello wrold\n');
    expect(parsedText.range).toEqual([content.indexOf('Hello'), content.length]);
  });

  it('returns the whole document when there is no front matter', () => {
    const content = 'Hello wrold\n';

    const result = parser.parse(content, 'example.md');
    const [parsedText] = [...result.parsedTexts];

    expect(parsedText.text).toBe(content);
    expect(parsedText.range).toEqual([0, content.length]);
  });

  it('preserves the filename and full content on the result', () => {
    const content = 'Hello wrold\n';

    const result = parser.parse(content, 'example.md');

    expect(result.filename).toBe('example.md');
    expect(result.content).toBe(content);
  });
});
