import type { RecommendedSettings } from '@internal/utils';

import { plugin as javaScriptPlugin, recommendedLanguageSettings } from './plugin.js';

export default {
  plugins: [javaScriptPlugin],
  languageSettings: recommendedLanguageSettings,
} satisfies RecommendedSettings;
