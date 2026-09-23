import type { AdvancedCSpellSettings } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { plugin } from './plugin.ts';
import recommended from './recommended.ts';

describe('recommended (cspell settings entry point)', () => {
  it('wires the plugin into a set of cspell settings', () => {
    expect(recommended.plugins).toEqual([plugin]);
  });

  it('selects the language-specific strings-comments parsers for supported file types', () => {
    expect(recommended.languageSettings).toEqual(
      expect.arrayContaining([
        {
          languageId: 'csharp',
          parser: 'csharp-strings-comments',
        },
      ]),
    );
  });

  it('is assignable to AdvancedCSpellSettings', () => {
    const cspellSettings: AdvancedCSpellSettings = recommended;
    expect(cspellSettings.plugins).toBeDefined();
  });
});
