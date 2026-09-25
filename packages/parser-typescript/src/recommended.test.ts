import type { AdvancedCSpellSettings } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { plugin } from './plugin.ts';
import recommended from './recommended.ts';

describe('recommended (cspell settings entry point)', () => {
  it('wires the plugin into a set of cspell settings', () => {
    expect(recommended.plugins).toEqual([plugin]);
  });

  it('selects a separate parser for each file type', () => {
    expect(recommended.languageSettings).toEqual([
      { languageId: 'javascript', parser: 'javascript' },
      { languageId: 'javascriptreact', parser: 'javascriptreact' },
      { languageId: 'typescript', parser: 'typescript' },
      { languageId: 'typescriptreact', parser: 'typescriptreact' },
    ]);
  });

  it('is assignable to AdvancedCSpellSettings', () => {
    const cspellSettings: AdvancedCSpellSettings = recommended;
    expect(cspellSettings.plugins).toBeDefined();
  });
});
