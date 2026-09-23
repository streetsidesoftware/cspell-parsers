import type { CSpellPlugin } from '@cspell/cspell-types';

import { plugin } from './plugin.ts';

/**
 * This package's default export: registers the plugin but doesn't select it for any file type. Add your own
 * `languageSettings`, or import `@cspell/parser-python-strings-comments/recommended` for a settings object
 * that already includes them.
 */
export interface SelectedCSpellSettings {
  plugins: CSpellPlugin[];
}

const settings: SelectedCSpellSettings = {
  plugins: [plugin],
};

export default settings;
