import type { RecommendedSettings } from '@internal/utils';

import { plugin, recommendedLanguageSettings } from './plugin.ts';

export default {
  plugins: [plugin],
  languageSettings: recommendedLanguageSettings,
} satisfies RecommendedSettings;
