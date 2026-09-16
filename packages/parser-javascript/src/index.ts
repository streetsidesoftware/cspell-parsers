import type { CSpellPlugin } from '@cspell/cspell-types';

import { plugin } from './plugin.js';

/**
 * Typed as this minimal shape rather than `AdvancedCSpellSettings` so tsdown only needs to bundle
 * `CSpellPlugin`'s (small) type graph into `dist/index.d.ts`, not the much larger one behind the full
 * settings type - `index.test.ts` separately checks this is still assignable to `AdvancedCSpellSettings`.
 */
export interface SelectedCSpellSettings {
  plugins: CSpellPlugin[];
}

const settings: SelectedCSpellSettings = {
  plugins: [plugin],
};

export default settings;
