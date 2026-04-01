import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
  },

  // JavaScript files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      // Code Quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',

      // TypeScript Specific
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }
)
