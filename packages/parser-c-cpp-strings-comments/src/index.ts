import type { CSpellPlugin } from '@cspell/cspell-types';

import { plugin } from './plugin.js';

/**
 * The shape of this package's default export - a minimal cspell settings object that registers the
 * plugin, but doesn't select it for any file type. Add your own `languageSettings` to choose which files
 * it applies to, or import `@cspell/parser-c-cpp-strings-comments/recommended` instead for a settings
 * object that already includes them.
 */
export interface SelectedCSpellSettings {
  plugins: CSpellPlugin[];
}

const settings: SelectedCSpellSettings = {
  plugins: [plugin],
};

export default settings;
