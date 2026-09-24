import { defineConfig } from 'tsdown';

/** Shared base for every package's `tsdown.config.ts`, which adds its own `entry` via `mergeConfig`. */
export default defineConfig({
  format: ['esm'],
  // eager: @internal/utils is imported as .ts source from outside a package's tsc program, which lazy dts can't emit.
  dts: { eager: true },
  sourcemap: true,
  clean: true,
  // Single ESM format + "type": "module" makes plain .js/.d.ts unambiguous.
  fixedExtension: false,
  // @cspell/cspell-types is a devDependency: its types are bundled into dist/*.d.ts so consumers
  // don't need it as a production dependency. onlyBundle documents that intentionally (rather than
  // tsdown's default warning) and fails the build if some other dependency gets bundled by accident.
  // (@internal/utils, a private workspace devDependency, is bundled automatically as a workspace package
  // and doesn't need - and triggers an "unused" warning from - an onlyBundle entry of its own.)
  deps: {
    onlyBundle: ['@cspell/cspell-types'],
  },
});
