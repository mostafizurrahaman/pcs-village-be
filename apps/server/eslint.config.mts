import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ['node_modules/**', 'dist/**', 'src/app/interfaces/**/*.d.ts'],
  },

  // TypeScript files
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
)
