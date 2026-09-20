import type { RecommendedSettings } from '@internal/utils';

import { plugin, recommendedLanguageSettings } from './plugin.js';

export default {
  plugins: [plugin],
  languageSettings: recommendedLanguageSettings,
} satisfies RecommendedSettings;
