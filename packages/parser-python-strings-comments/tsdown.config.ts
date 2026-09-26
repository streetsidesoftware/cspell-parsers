import { mergeConfig } from 'tsdown';

import base from '../../.config/tsdown.config.ts';

export default mergeConfig(base, {
  entry: ['src/index.ts', 'src/plugin.ts', 'src/recommended.ts'],
});
