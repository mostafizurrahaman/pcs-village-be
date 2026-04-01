# Monorepo Configuration Guide

A simple, step-by-step guide to set up TypeScript, ESLint, and Prettier in your monorepo.

## 📋 What We're Building

We want to create a monorepo where:
- **TypeScript config** is shared from the root (one base config, everyone uses it)
- **ESLint** is configured separately for each project (each project has its own rules)
- **Prettier** is shared from the root (same formatting everywhere)

## 🏗️ Current Structure

```
tss-workspace/
├── apps/
│   └── server/              # Your backend server
├── packages/
│   ├── db/                  # Database package
│   └── shared/              # Shared utilities
├── package.json             # Root package.json
├── tsconfig.base.json       # Base TypeScript config
└── pnpm-workspace.yaml      # Workspace definition
```

## 🎯 Goals

### TypeScript (Global Base Config)
- Create one `tsconfig.base.json` at the root
- All projects extend this base config
- Each project only adds project-specific settings

### ESLint (Individual Project Configs)
- Each project has its own `eslint.config.mts`
- Each project can have different linting rules
- Root has a base config for reference

### Prettier (Global Config)
- One `.prettierrc.json` at the root
- All projects use the same formatting
- No need for individual Prettier configs

---

## 📝 Step-by-Step Implementation

### Step 1: Update Root TypeScript Config

**File:** `tsconfig.base.json` (at root)

This is the master config that all projects will use.

```json
{
  "compilerOptions": {
    // Module System - How TypeScript handles imports/exports
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ESNext",
    
    // Type Checking - Make TypeScript strict
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    
    // Module Features
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    
    // Output Settings
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    
    // Project Settings
    "composite": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleDetection": "force",
    "noUncheckedSideEffectImports": true,
    
    // Path Mapping - How to import workspace packages
    "baseUrl": ".",
    "paths": {
      "@repo/*": ["packages/*/src"]
    },
    
    // Node.js Types
    "types": ["node"],
    "lib": ["ESNext"]
  }
}
```

**What each setting means:**
- `module: "NodeNext"` - Use modern Node.js module system
- `strict: true` - Enable all strict type checking
- `composite: true` - Allows TypeScript to build faster in monorepos
- `paths` - Lets you import like `import { something } from '@repo/shared'`

---

### Step 2: Update Server TypeScript Config

**File:** `apps/server/tsconfig.json`

This extends the base config and only adds server-specific settings.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**What this does:**
- `extends` - Inherits all settings from base config
- `rootDir` - Where your source code lives
- `outDir` - Where compiled JavaScript goes
- `include` - Which files to compile
- `exclude` - Which files to ignore

---

### Step 3: Create TypeScript Config for Shared Package

**File:** `packages/shared/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Step 4: Create TypeScript Config for DB Package

**File:** `packages/db/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Step 5: Create Global Prettier Config

**File:** `.prettierrc.json` (at root)

This controls how your code looks.

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5",
  "endOfLine": "lf",
  "arrowParens": "always",
  "bracketSpacing": true
}
```

**What each setting means:**
- `semi: false` - No semicolons at end of lines
- `singleQuote: true` - Use single quotes instead of double
- `printWidth: 100` - Wrap lines longer than 100 characters
- `tabWidth: 2` - Use 2 spaces for indentation
- `trailingComma: "es5"` - Add commas where ES5 allows
- `endOfLine: "lf"` - Use Linux-style line endings

---

### Step 6: Create Prettier Ignore File

**File:** `.prettierignore` (at root)

Tell Prettier which files to skip.

```
# Dependencies
node_modules

# Build outputs
dist
build
.turbo

# Lock files
pnpm-lock.yaml
package-lock.json
yarn.lock

# Environment files
.env
.env.*

# Logs
*.log
```

---

### Step 7: Update Root ESLint Config

**File:** `eslint.config.mts` (at root)

This is a reference config. Each project will have its own.

```typescript
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
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  }
)
```

---

### Step 8: Create Server ESLint Config

**File:** `apps/server/eslint.config.mts`

```typescript
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ['node_modules/**', 'dist/**'],
  },

  // TypeScript files
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Server-specific rules
      'no-console': 'off', // Allow console in server
      'no-unused-vars': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
)
```

---

### Step 9: Create Shared Package ESLint Config

**File:** `packages/shared/eslint.config.mts`

```typescript
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**'],
  },

  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
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
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
)
```

---

### Step 10: Create DB Package ESLint Config

**File:** `packages/db/eslint.config.mts`

```typescript
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**'],
  },

  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
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
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
)
```

---

### Step 11: Update Root Package.json

**File:** `package.json` (at root)

Add scripts to run linting and formatting across all projects.

```json
{
  "name": "tss-workspace",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter server dev",
    "lint": "pnpm -r exec eslint .",
    "lint:fix": "pnpm -r exec eslint . --fix",
    "format": "prettier --write \"**/*.{ts,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,js,json,md}\"",
    "type-check": "pnpm -r exec tsc --noEmit"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.2",
    "@types/node": "^25.0.8",
    "@typescript-eslint/eslint-plugin": "^8.53.0",
    "@typescript-eslint/parser": "^8.53.0",
    "cross-env": "^10.1.0",
    "eslint": "^9.39.2",
    "globals": "^17.0.0",
    "jiti": "^2.6.1",
    "prettier": "^3.7.4",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.53.0"
  }
}
```

---

### Step 12: Remove Duplicate Prettier Config from Server

**Action:** Delete `apps/server/.prettierrc.json`

The server will now use the root Prettier config automatically.

---

## 🚀 How to Use

### Check TypeScript Types
```bash
# Check all projects
pnpm type-check

# Check specific project
cd apps/server
pnpm exec tsc --noEmit
```

### Run Linting
```bash
# Lint all projects
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Lint specific project
cd apps/server
pnpm exec eslint .
```

### Format Code
```bash
# Format all files
pnpm format

# Check if files are formatted
pnpm format:check

# Format specific directory
prettier --write "apps/server/src/**/*.ts"
```

---

## 🔍 Understanding the Setup

### Why This Structure?

**TypeScript (Global Base)**
- ✅ One source of truth for TypeScript settings
- ✅ Easy to update settings for all projects at once
- ✅ Ensures consistency across the monorepo
- ✅ Each project only specifies its unique needs

**ESLint (Individual Configs)**
- ✅ Server can have different rules than packages
- ✅ Flexibility for different code standards
- ✅ Each team can customize their linting
- ✅ Still maintains consistency through shared plugins

**Prettier (Global Config)**
- ✅ Code looks the same everywhere
- ✅ No arguments about formatting
- ✅ One config to maintain
- ✅ Automatic formatting on save (with IDE setup)

---

## 🛠️ IDE Setup (VS Code)

### Install Extensions
1. ESLint
2. Prettier - Code formatter

### Settings (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "typescript"
  ],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 📚 Common Commands Reference

| Command | What It Does |
|---------|-------------|
| `pnpm type-check` | Check TypeScript types in all projects |
| `pnpm lint` | Run ESLint on all projects |
| `pnpm lint:fix` | Auto-fix ESLint issues |
| `pnpm format` | Format all code with Prettier |
| `pnpm format:check` | Check if code is formatted |
| `pnpm -r exec <command>` | Run command in all workspace packages |
| `pnpm --filter server dev` | Run dev script in server only |

---

## ❓ Troubleshooting

### TypeScript can't find `@repo/*` imports
**Solution:** Make sure `baseUrl` and `paths` are set in `tsconfig.base.json`

### ESLint not working
**Solution:** 
1. Check that `eslint.config.mts` exists in the project
2. Run `pnpm install` to ensure dependencies are installed
3. Restart your IDE

### Prettier not formatting
**Solution:**
1. Check that `.prettierrc.json` exists at root
2. Install Prettier extension in VS Code
3. Set Prettier as default formatter in VS Code settings

### Build errors after changes
**Solution:**
1. Delete all `node_modules` and `dist` folders
2. Run `pnpm install`
3. Run `pnpm type-check` to see specific errors

---

## 🎉 Summary

You now have:
- ✅ **One TypeScript config** that all projects extend
- ✅ **Individual ESLint configs** for each project
- ✅ **One Prettier config** for consistent formatting
- ✅ **Scripts** to check, lint, and format everything
- ✅ **A clean, maintainable monorepo structure**

Happy coding! 🚀
