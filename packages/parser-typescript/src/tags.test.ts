import { describe, expect, it } from 'vitest';

import { tags, tagsAndMeaning } from './tags.ts';

describe('tags (re-exported from @cspell/parser-typescript-tree-sitter-wasm)', () => {
  it('documents every tag the parser can emit', () => {
    expect(tagsAndMeaning.comment).toBeDefined();
    expect(tagsAndMeaning['identifier.variable']).toBeDefined();
  });

  it('matches tagsAndMeaning to the same set of keys', () => {
    expect(Object.keys(tags).sort()).toEqual(Object.keys(tagsAndMeaning).sort());
  });
});
