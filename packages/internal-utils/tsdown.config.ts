import { defineConfig } from 'tsdown';

// Types only: consumers bundle the JS straight from src/, but their lazy dts needs a prebuilt .d.ts to resolve.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { emitDtsOnly: true },
  clean: true,
  fixedExtension: false,
  // Left external so each consumer bundles a single, deduped copy of these types.
  deps: {
    neverBundle: ['@cspell/cspell-types'],
  },
});
