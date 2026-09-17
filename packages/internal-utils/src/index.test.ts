import { describe, expect, it } from 'vitest';

import { stripCommentMarkers as stripCommentMarkersImpl } from './comments.js';
import { customizeParser as customizeParserImpl } from './customize.js';
import { customizeParser, decodeStringParts, stripCommentMarkers } from './index.js';
import { decodeStringParts as decodeStringPartsImpl } from './strings.js';

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
});
