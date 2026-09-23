import type { CSpellPlugin } from '@cspell/cspell-types';

import { plugin } from './plugin.ts';

/**
 * Registers the plugin without selecting it for any file type - add your own `languageSettings`, or use
 * `@cspell/parser-rust-strings-comments/recommended` for a settings object that already includes them.
 */
export interface SelectedCSpellSettings {
  plugins: CSpellPlugin[];
}

const settings: SelectedCSpellSettings = {
  plugins: [plugin],
};

export default settings;
