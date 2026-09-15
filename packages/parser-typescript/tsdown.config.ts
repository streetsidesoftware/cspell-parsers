import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/parser.ts', 'src/plugin.ts', 'src/recommended.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Single ESM format + "type": "module" makes plain .js/.d.ts unambiguous.
  fixedExtension: false,
});
