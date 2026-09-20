import type { RecommendedSettings } from '@internal/utils';

import { plugin as typeScriptPlugin, recommendedLanguageSettings } from './plugin.js';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: recommendedLanguageSettings,
} satisfies RecommendedSettings;
