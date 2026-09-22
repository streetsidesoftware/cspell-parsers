import type { ParsedText } from '@cspell/cspell-types';

import { assert } from './assert.js';

export type ParsedTextEmitter = (src: Iterable<ParsedText>) => Iterable<ParsedText>;

/**
 * Creates an emitter that fills in gaps between parsed text items with code tags.
 * @param codeTags - The set of tags to use for code segments.
 * @param fileContent - The full content of the file being processed.
 * @returns An emitter function that fills in gaps between parsed text items with code tags.
 */
export function createCodeTagsEmitter<T extends Record<string, boolean>>(
  codeTags: T,
  fileContent: string,
): ParsedTextEmitter {
  assert(Object.isFrozen(codeTags), 'Tag object must be frozen');

  function* emitter(src: Iterable<ParsedText>): Iterable<ParsedText> {
    const tags = codeTags;
    let i = 0;
    for (const item of src) {
      const [a, b] = item.range;
      if (a > i) {
        const text = fileContent.slice(i, a);
        yield {
          text,
          range: [i, a],
          tags,
        };
      }
      i = b;
      yield item;
    }
    if (i < fileContent.length) {
      yield {
        text: fileContent.slice(i),
        range: [i, fileContent.length],
        tags: codeTags,
      };
    }
  }
  return emitter;
}
