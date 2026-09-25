import type { RecommendedSettings } from '@internal/utils';

import { plugin } from './plugin.ts';

export default {
  plugins: [plugin],
  languageSettings: plugin.languageSettings(),
} satisfies RecommendedSettings;
