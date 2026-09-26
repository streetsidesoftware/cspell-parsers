import type { SelectedCSpellSettings } from '@internal/utils';

import { plugin } from './plugin.ts';

export type { SelectedCSpellSettings };

/**
 * Registers the plugin without selecting it for any file type - add your own `languageSettings`, or use
 * `@cspell/parser-rust-strings-comments/recommended` for a settings object that already includes them.
 */
const settings: SelectedCSpellSettings = {
  plugins: [plugin],
};

export default settings;
