import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', '.react-email/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        // This line fixes the "multiple candidate TSConfigRootDirs" error
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  }
)
