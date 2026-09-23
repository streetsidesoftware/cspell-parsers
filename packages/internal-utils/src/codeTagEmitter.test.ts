import type { ParsedText } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { createCodeTagsEmitter } from './codeTagEmitter.ts';

const CODE_TAG = Object.freeze({ code: true });

function mkText(text: string, range: [number, number]): ParsedText {
  return { text, range };
}

function run(content: string, items: ParsedText[]): ParsedText[] {
  const emit = createCodeTagsEmitter(CODE_TAG, content);
  return [...emit(items)];
}

describe('createCodeTagsEmitter', () => {
  describe('tags argument', () => {
    it('throws if the tags object is not frozen', () => {
      expect(() => createCodeTagsEmitter({ code: true }, 'content')).toThrow();
    });

    it('does not throw for a frozen tags object', () => {
      expect(() => createCodeTagsEmitter(CODE_TAG, 'content')).not.toThrow();
    });
  });

  it('passes through a single item that already covers the whole content untouched', () => {
    const content = 'hello';
    const items = [mkText('hello', [0, 5])];
    expect(run(content, items)).toEqual(items);
  });

  it('fills a leading gap before the first item', () => {
    const content = '  hello';
    const items = [mkText('hello', [2, 7])];

    expect(run(content, items)).toEqual([{ text: '  ', range: [0, 2], tags: CODE_TAG }, ...items]);
  });

  it('fills a gap between two items', () => {
    const content = 'AAA   BBB';
    const items = [mkText('AAA', [0, 3]), mkText('BBB', [6, 9])];

    expect(run(content, items)).toEqual([items[0], { text: '   ', range: [3, 6], tags: CODE_TAG }, items[1]]);
  });

  it('does not insert a spurious segment between two adjacent items with no gap between them', () => {
    const content = 'AAAAABBBBB'; // cspell:disable-line
    const items = [mkText('AAAAA', [0, 5]), mkText('BBBBB', [5, 10])];

    expect(run(content, items)).toEqual(items);
  });

  it('fills a trailing gap after the last item', () => {
    const content = 'hello   ';
    const items = [mkText('hello', [0, 5])];

    expect(run(content, items)).toEqual([...items, { text: '   ', range: [5, 8], tags: CODE_TAG }]);
  });

  it('fills the whole content as one segment when there are no input items at all', () => {
    const content = 'all code, nothing tagged';

    expect(run(content, [])).toEqual([{ text: content, range: [0, content.length], tags: CODE_TAG }]);
  });

  it('yields nothing for empty content and no items', () => {
    expect(run('', [])).toEqual([]);
  });

  it('fills gaps around three items, including leading, middle, and trailing gaps', () => {
    const content = '..AAA..BBB..CCC..';
    const items = [mkText('AAA', [2, 5]), mkText('BBB', [7, 10]), mkText('CCC', [12, 15])];

    expect(run(content, items)).toEqual([
      { text: '..', range: [0, 2], tags: CODE_TAG },
      items[0],
      { text: '..', range: [5, 7], tags: CODE_TAG },
      items[1],
      { text: '..', range: [10, 12], tags: CODE_TAG },
      items[2],
      { text: '..', range: [15, 17], tags: CODE_TAG },
    ]);
  });

  it('reuses the same tags reference on every emitted gap segment rather than cloning it', () => {
    const content = '.A.B.';
    const items = [mkText('A', [1, 2]), mkText('B', [3, 4])];
    const result = run(content, items);
    const gaps = result.filter((p) => p.tags === CODE_TAG);

    expect(gaps).toHaveLength(3);
    for (const gap of gaps) {
      expect(gap.tags).toBe(CODE_TAG);
    }
  });

  it('is lazy: nothing is pulled from the source iterable until the result is iterated', () => {
    let pulled = false;
    function* src(): Generator<ParsedText> {
      pulled = true;
      yield mkText('a', [0, 1]);
    }

    const emit = createCodeTagsEmitter(CODE_TAG, 'a');
    const result = emit(src());
    expect(pulled).toBe(false);

    expect([...result]).toEqual([mkText('a', [0, 1])]);
    expect(pulled).toBe(true);
  });
});
