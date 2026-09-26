import type { SelectedCSpellSettings } from '@internal/utils';

import { plugin } from './plugin.ts';

export type { SelectedCSpellSettings };

/**
 * This package's default export: registers the plugin but doesn't select it for any file type. Add your own
 * `languageSettings`, or import `@cspell/parser-python-strings-comments/recommended` for a settings object
 * that already includes them.
 */
const settings: SelectedCSpellSettings = {
  plugins: [plugin],
};

export default settings;
