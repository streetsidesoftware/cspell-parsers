import type { AdvancedCSpellSettings } from '@cspell/cspell-types';

import { plugin } from './plugin.js';

const settings: AdvancedCSpellSettings = {
  plugins: [plugin],
};

export default settings;
