import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/parser.ts', 'src/plugin.ts', 'src/recommended.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Single ESM format + "type": "module" makes plain .js/.d.ts unambiguous.
  fixedExtension: false,
  // @cspell/cspell-types is a devDependency: its types are bundled into dist/*.d.ts so consumers
  // don't need it as a production dependency. onlyBundle documents that intentionally (rather than
  // tsdown's default warning) and fails the build if some other dependency gets bundled by accident.
  deps: {
    onlyBundle: ['@cspell/cspell-types'],
  },
});
