import type { AdvancedCSpellSettings } from '@cspell/cspell-types';
import { describe, expect, it } from 'vitest';

import { createPlugin } from './plugin.ts';
import type { SelectedCSpellSettings } from './types.ts';

describe('SelectedCSpellSettings', () => {
  it('is assignable to AdvancedCSpellSettings', () => {
    const selected: SelectedCSpellSettings = { plugins: [createPlugin({ name: 'test', parsers: [] })] };
    const settings: AdvancedCSpellSettings = selected;
    expect(settings.plugins).toHaveLength(1);
  });
});
