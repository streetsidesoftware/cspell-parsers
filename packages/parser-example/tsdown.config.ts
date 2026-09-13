import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // Single ESM format + "type": "module" makes plain .js/.d.ts unambiguous.
  fixedExtension: false,
});
