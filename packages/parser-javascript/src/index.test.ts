import type { AdvancedCSpellSettings } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import settings from './index.ts';
import { plugin } from './plugin.ts';

describe('index (cspell settings entry point)', () => {
  it('wires the plugin into a set of cspell settings', () => {
    expect(settings.plugins).toEqual([plugin]);
  });

  it('is assignable to AdvancedCSpellSettings', () => {
    const cspellSettings: AdvancedCSpellSettings = settings;
    expect(cspellSettings.plugins).toBeDefined();
  });
});
