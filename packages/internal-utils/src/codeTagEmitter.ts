import type { ParsedText } from '@cspell/cspell-types';

import { assert } from './assert.js';

export type ParsedTextEmitter = (src: Iterable<ParsedText>) => Iterable<ParsedText>;

export function createCodeTagsEmitter<T extends Record<string, boolean>>(
  tags: T,
  fileContent: string,
): ParsedTextEmitter {
  assert(Object.isFrozen(tags), 'Tag object must be frozen');

  function* emitter(src: Iterable<ParsedText>): Iterable<ParsedText> {
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
        tags,
      };
    }
  }
  return emitter;
}
