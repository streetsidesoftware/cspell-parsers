import { describe, expect, it } from 'vitest';

import { stripCommentMarkers as stripCommentMarkersImpl } from './comments.ts';
import { codeTagMeaning, customizeParser, decodeStringParts, stripCommentMarkers } from './index.ts';
import { customizeParser as customizeParserImpl } from './parser.ts';
import { decodeStringParts as decodeStringPartsImpl } from './strings.ts';
import { codeTagMeaning as codeTagMeaningImpl } from './tags.ts';

describe('index', () => {
  it('re-exports stripCommentMarkers from comments.js', () => {
    expect(stripCommentMarkers).toBe(stripCommentMarkersImpl);
  });

  it('re-exports decodeStringParts from strings.js', () => {
    expect(decodeStringParts).toBe(decodeStringPartsImpl);
  });

  it('re-exports customizeParser from customize.js', () => {
    expect(customizeParser).toBe(customizeParserImpl);
  });

  it('re-exports codeTagMeaning from tags.js', () => {
    expect(codeTagMeaning).toBe(codeTagMeaningImpl);
  });
});
