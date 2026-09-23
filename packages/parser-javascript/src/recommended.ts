import type { RecommendedSettings } from '@internal/utils';

import { plugin as javaScriptPlugin, recommendedLanguageSettings } from './plugin.ts';

export default {
  plugins: [javaScriptPlugin],
  languageSettings: recommendedLanguageSettings,
} satisfies RecommendedSettings;
