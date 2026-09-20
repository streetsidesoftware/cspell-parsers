import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import nodePlugin from 'eslint-plugin-n';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

// import importPlugin from 'eslint-plugin-import';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/dist-test/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/fixtures/**',
      'test-packages/*/tests/*/**',
      'packages/*/samples/*/**',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        URL: 'readonly',
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  js.configs.recommended,
  nodePlugin.configs['flat/recommended'],
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    extends: [...tsEslint.configs.recommended],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // {
  //   files: ['**/*.{ts,mts,cts,tsx}'],
  //   ignores: ['**/*.d.*'],
  //   plugins: {
  //     import: importPlugin,
  //   },
  //   languageOptions: {
  //     parser: tsEslint.parser,
  //     parserOptions: {
  //       // project: true, // Uses your tsconfig.json
  //     },
  //   },
  //   settings: {
  //     'import/resolver': {
  //       // This is the critical part for TypeScript support
  //       typescript: {
  //         alwaysTryTypes: true,
  //       },
  //     },
  //   },
  //   rules: {
  //     'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
  //     'import/no-duplicates': ['error', { 'prefer-inline': false }],
  //     '@typescript-eslint/no-import-type-side-effects': 'error',
  //     '@typescript-eslint/consistent-type-imports': [
  //       'error',
  //       { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
  //     ],
  //   },
  // },
  {
    files: ['scripts/**', '**/*.test.*', '**/*.config.{ts,js,mts,mjs,cjs,cts}'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-extraneous-import': 'off',
    },
  },
);
