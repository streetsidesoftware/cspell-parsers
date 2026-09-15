import { describe, expect, it } from 'vitest';

import { plugin } from './plugin.js';
import recommended from './recommended.js';

describe('recommended (cspell settings entry point)', () => {
  it('wires the plugin into a set of cspell settings', () => {
    expect(recommended.plugins).toEqual([plugin]);
  });

  it('selects the typescript parser for TS/JS/TSX/JSX language ids', () => {
    expect(recommended.languageSettings).toEqual([
      {
        languageId: 'typescript,javascript,typescriptreact,javascriptreact',
        parser: 'typescript',
      },
    ]);
  });
});
