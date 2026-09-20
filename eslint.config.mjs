import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import nodePlugin from 'eslint-plugin-n';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
    extends: [...tseslint.configs.recommended],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['scripts/**', '**/*.test.*', '**/*.config.{ts,js,mts,mjs,cjs,cts}'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-extraneous-import': 'off',
    },
  },
);
