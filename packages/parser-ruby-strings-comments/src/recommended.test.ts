import type { AdvancedCSpellSettings } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { plugin, supportedFileTypes } from './plugin.ts';
import recommended from './recommended.ts';

describe('recommended (cspell settings entry point)', () => {
  it('wires the plugin into a set of cspell settings', () => {
    expect(recommended.plugins).toEqual([plugin]);
  });

  it('selects the ruby-strings-comments parser for every supported file type', () => {
    expect(recommended.languageSettings).toEqual([
      {
        languageId: supportedFileTypes.join(','),
        parser: 'ruby-strings-comments',
      },
    ]);
  });

  it('is assignable to AdvancedCSpellSettings', () => {
    const cspellSettings: AdvancedCSpellSettings = recommended;
    expect(cspellSettings.plugins).toBeDefined();
  });
});
