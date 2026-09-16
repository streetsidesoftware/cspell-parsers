import { describe, expect, it } from 'vitest';

import { plugin, supportedFileTypes } from './plugin.js';
import recommended from './recommended.js';
import type { AdvancedCSpellSettings } from '@cspell/cspell-types';

describe('recommended (cspell settings entry point)', () => {
  it('wires the plugin into a set of cspell settings', () => {
    expect(recommended.plugins).toEqual([plugin]);
  });

  it('selects the c-style-comments parser for every supported file type', () => {
    expect(recommended.languageSettings).toEqual([
      {
        languageId: supportedFileTypes.join(','),
        parser: 'c-style-comments',
      },
    ]);
  });

  it('is assignable to AdvancedCSpellSettings', () => {
    const cspellSettings: AdvancedCSpellSettings = recommended;
    expect(cspellSettings.plugins).toBeDefined();
  });
});
