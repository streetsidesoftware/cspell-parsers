import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import nodePlugin from 'eslint-plugin-n';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/dist-test/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/fixtures/**',
      '.claude/worktrees/**',
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
      // A brace-less body is fine on the same line as its `if`, but not once it wraps onto its own line.
      curly: ['error', 'multi-line'],
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
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports', disallowTypeAnnotations: true },
      ],
      // consistent-type-imports allows `import { a, type B }`; require a separate `import type` instead.
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportDeclaration[importKind='value'] > ImportSpecifier[importKind='type']",
          message:
            'Move type imports into a separate `import type { ... }` statement instead of an inline `type` specifier.',
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
