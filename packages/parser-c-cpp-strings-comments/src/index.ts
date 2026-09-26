import type { SelectedCSpellSettings } from '@internal/utils';

import { plugin } from './plugin.ts';

export type { SelectedCSpellSettings };

/**
 * The shape of this package's default export - a minimal cspell settings object that registers the
 * plugin, but doesn't select it for any file type. Add your own `languageSettings` to choose which files
 * it applies to, or import `@cspell/parser-c-cpp-strings-comments/recommended` instead for a settings
 * object that already includes them.
 */
const settings: SelectedCSpellSettings = {
  plugins: [plugin],
};

export default settings;
