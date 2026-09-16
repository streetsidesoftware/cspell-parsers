import { describe, expect, it } from 'vitest';

import { plugin } from './plugin.js';
import settings from './index.js';

describe('index (cspell settings entry point)', () => {
  it('wires the plugin into a set of cspell settings', () => {
    expect(settings.plugins).toEqual([plugin]);
  });
});
