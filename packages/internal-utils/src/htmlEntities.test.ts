import { describe, expect, it } from 'vitest';

import { decodeHtmlCharacterReference, decodeHtmlTextParts } from './htmlEntities.ts';

describe('decodeHtmlCharacterReference', () => {
  it.each([
    ['&eacute;', 'é'],
    ['&amp;', '&'],
    ['&nbsp;', ' '],
    ['&Omega;', 'Ω'],
    ['&#239;', 'ï'],
    ['&#x2014;', '—'],
    ['&#X1F600;', '😀'],
  ])('decodes %s', (raw, expected) => {
    expect(decodeHtmlCharacterReference(raw)).toBe(expected);
  });

  it.each(['&bogus;', '&#x110000;', '&amp', 'amp;'])('leaves %s unchanged', (raw) => {
    expect(decodeHtmlCharacterReference(raw)).toBe(raw);
  });
});

describe('decodeHtmlTextParts', () => {
  it('joins a run of text and references, with a map back to the raw offsets', () => {
    const decoded = decodeHtmlTextParts([
      { text: 'Caf', isCharacterReference: false },
      { text: '&eacute;', isCharacterReference: true },
      { text: ' ', isCharacterReference: false },
      { text: '&bogus;', isCharacterReference: true },
    ]);

    expect(decoded).toEqual({ text: 'Café &bogus;', map: [3, 3, 8, 1, 1, 1, 7, 7] });
  });
});
