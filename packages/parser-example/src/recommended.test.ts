import { describe, expect, it } from 'vitest';

import { plugin } from './plugin.js';
import recommended from './recommended.js';

describe('recommended (cspell settings entry point)', () => {
  it('wires the plugin into a set of cspell settings', () => {
    expect(recommended.plugins).toEqual([plugin]);
  });

  it('selects the c-style-comments parser for C-style language ids', () => {
    expect(recommended.languageSettings).toEqual([
      {
        languageId: 'c,cpp,csharp,java,javascript,typescript',
        parser: 'c-style-comments',
      },
    ]);
  });
});
