import { describe, expect, it } from 'vitest';

import { stripCommentMarkers as stripCommentMarkersImpl } from './comments.ts';
import { codeTagMeaning, customizePluginWith, decodeStringParts, stripCommentMarkers } from './index.ts';
import { customizePluginWith as customizePluginWithImpl } from './plugin.ts';
import { decodeStringParts as decodeStringPartsImpl } from './strings.ts';
import { codeTagMeaning as codeTagMeaningImpl } from './tags.ts';

describe('index', () => {
  it('re-exports stripCommentMarkers from comments.js', () => {
    expect(stripCommentMarkers).toBe(stripCommentMarkersImpl);
  });

  it('re-exports decodeStringParts from strings.js', () => {
    expect(decodeStringParts).toBe(decodeStringPartsImpl);
  });

  it('re-exports customizePluginWith from plugin.js', () => {
    expect(customizePluginWith).toBe(customizePluginWithImpl);
  });

  it('re-exports codeTagMeaning from tags.js', () => {
    expect(codeTagMeaning).toBe(codeTagMeaningImpl);
  });
});
