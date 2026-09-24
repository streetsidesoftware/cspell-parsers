import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/parser.ts', 'src/plugin.ts', 'src/recommended.ts'],
  format: ['esm'],
  // eager: @internal/utils is imported as .ts source from outside this package's tsc program, which lazy dts can't emit.
  dts: { eager: true },
  sourcemap: true,
  clean: true,
  // Single ESM format + "type": "module" makes plain .js/.d.ts unambiguous.
  fixedExtension: false,
  // @cspell/cspell-types is a devDependency: its types are bundled into dist/*.d.ts so consumers
  // don't need it as a production dependency. onlyBundle documents that intentionally (rather than
  // tsdown's default warning) and fails the build if some other, unintended dependency ends up bundled.
  // @cspell/parser-typescript is a production dependency (this package is a thin wrapper around it), so
  // tsdown externalizes it automatically - it's never bundled. (@internal/utils, a private/unpublished
  // workspace devDependency used by plugin.ts, is bundled automatically as a workspace package and doesn't
  // need - and triggers an "unused" warning from - an onlyBundle entry of its own.)
  deps: {
    onlyBundle: ['@cspell/cspell-types'],
  },
});
