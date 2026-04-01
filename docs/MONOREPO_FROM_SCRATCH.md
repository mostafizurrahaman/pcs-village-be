# Complete Monorepo Setup Guide - From Scratch

A step-by-step guide to create a production-ready monorepo with Turbo, TypeScript, ESLint, and Prettier for backend Node.js projects.

---

## 📋 What You'll Build

A monorepo structure like this:
```
my-monorepo/
├── apps/
│   └── server/              # Your backend API
├── packages/
│   ├── db/                  # Database models & logic
│   └── shared/              # Shared utilities
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # Workspace definition
├── turbo.json               # Turbo configuration
├── tsconfig.base.json       # Base TypeScript config
├── eslint.config.mts        # Root ESLint config
└── .prettierrc.json         # Prettier config
```

---

## 🚀 Step-by-Step Setup

### Step 1: Create Project Directory

```bash
# Create and enter your project directory
mkdir my-monorepo
cd my-monorepo

# Initialize git
git init
```

---

### Step 2: Initialize pnpm Workspace

```bash
# Initialize package.json
pnpm init
```

**Edit `package.json`:**
```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@10.27.0"
}
```

**Create `pnpm-workspace.yaml`:**
```yaml
packages:
  - packages/*
  - apps/*

ignoredBuiltDependencies:
  - esbuild
```

---

### Step 3: Create Directory Structure

```bash
# Create directories
mkdir -p apps/server/src
mkdir -p packages/db/src
mkdir -p packages/shared/src
```

---

### Step 4: Install Root Dependencies

```bash
# Install dev dependencies at root
pnpm add -D -w turbo typescript prettier eslint @eslint/js @types/node globals jiti typescript-eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

**What each package does:**
- `turbo` - Build system with caching
- `typescript` - TypeScript compiler
- `prettier` - Code formatter
- `eslint` - Code linter
- `typescript-eslint` - TypeScript support for ESLint

---

### Step 5: Create Base TypeScript Config

**Create `tsconfig.base.json` at root:**
```json
{
  "compilerOptions": {
    // Module System
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ESNext",
    
    // Type Checking
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
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleDetection": "force",
    "noUncheckedSideEffectImports": true,
    
    // Path Mapping
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

---

### Step 6: Create Prettier Config

**Create `.prettierrc.json` at root:**
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

**Create `.prettierignore` at root:**
```
node_modules
dist
build
.turbo
pnpm-lock.yaml
*.log
```

---

### Step 7: Create Root ESLint Config

**Create `eslint.config.mts` at root:**
```typescript
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
  },

  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },

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
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }
)
```

---

### Step 8: Create Turbo Config

**Create `turbo.json` at root:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "lint:fix": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

### Step 9: Update Root Package.json

**Edit `package.json` to add scripts:**
```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@10.27.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "format": "prettier --write \"**/*.{ts,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,js,json,md}\"",
    "type-check": "turbo type-check",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.2",
    "@types/node": "^25.0.8",
    "@typescript-eslint/eslint-plugin": "^8.53.0",
    "@typescript-eslint/parser": "^8.53.0",
    "eslint": "^9.39.2",
    "globals": "^17.0.0",
    "jiti": "^2.6.1",
    "prettier": "^3.7.4",
    "turbo": "^2.7.4",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.53.0"
  }
}
```

---

### Step 10: Setup Server Package

**Create `apps/server/package.json`:**
```json
{
  "name": "server",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/server.ts",
  "scripts": {
    "dev": "tsx watch ./src/server.ts",
    "build": "tsc",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist .turbo node_modules"
  },
  "dependencies": {
    "@repo/db": "workspace:*",
    "@repo/shared": "workspace:*",
    "express": "^5.2.1",
    "dotenv": "^17.2.3"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "tsx": "^4.21.0"
  }
}
```

**Create `apps/server/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.js", "**/*.js.map", "**/*.d.ts", "**/*.d.ts.map"]
}
```

**Create `apps/server/eslint.config.mts`:**
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
      'no-console': 'off',
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
)
```

**Create `apps/server/src/server.ts`:**
```typescript
import express, { type Request, type Response } from 'express'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server is running!' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

---

### Step 11: Setup Shared Package

**Create `packages/shared/package.json`:**
```json
{
  "name": "@repo/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist .turbo node_modules"
  }
}
```

**Create `packages/shared/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.js", "**/*.js.map", "**/*.d.ts", "**/*.d.ts.map"]
}
```

**Create `packages/shared/eslint.config.mts`:**
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
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
)
```

**Create `packages/shared/src/index.ts`:**
```typescript
export const greet = (name: string): string => {
  return `Hello, ${name}!`
}
```

---

### Step 12: Setup DB Package

**Create `packages/db/package.json`:**
```json
{
  "name": "@repo/db",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist .turbo node_modules"
  },
  "dependencies": {
    "@repo/shared": "workspace:*"
  }
}
```

**Create `packages/db/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.js", "**/*.js.map", "**/*.d.ts", "**/*.d.ts.map"]
}
```

**Create `packages/db/eslint.config.mts`:**
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
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
)
```

**Create `packages/db/src/index.ts`:**
```typescript
import { greet } from '@repo/shared'

export const dbConnect = (): void => {
  console.log(greet('Database'))
}
```

---

### Step 13: Create .gitignore

**Create `.gitignore` at root:**
```
# Dependencies
node_modules

# Build outputs
dist
build
.turbo

# Environment files
.env
.env.*
!.env.example

# Logs
*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/*
!.vscode/settings.json
.idea
```

---

### Step 14: Install All Dependencies

```bash
# Install all dependencies
pnpm install
```

---

### Step 15: Verify Setup

```bash
# Check TypeScript
pnpm type-check

# Check linting
pnpm lint

# Format code
pnpm format

# Build all packages
pnpm build

# Run dev server
pnpm dev
```

---

## 🎯 Usage Commands

### Development
```bash
pnpm dev              # Run dev servers
```

### Building
```bash
pnpm build            # Build all packages (with caching)
pnpm build --force    # Build without cache
```

### Linting
```bash
pnpm lint             # Lint all packages
pnpm lint:fix         # Auto-fix linting issues
```

### Formatting
```bash
pnpm format           # Format all code
pnpm format:check     # Check formatting
```

### Type Checking
```bash
pnpm type-check       # Check TypeScript types
```

### Cleaning
```bash
pnpm clean            # Clean all build artifacts
```

---

## 📁 Final Directory Structure

```
my-monorepo/
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
│
├── apps/
│   └── server/
│       ├── eslint.config.mts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── server.ts
│
└── packages/
    ├── db/
    │   ├── eslint.config.mts
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts
    │
    └── shared/
        ├── eslint.config.mts
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── index.ts
```

---

## ✅ What You Have Now

✅ **Turbo** - Fast builds with intelligent caching  
✅ **TypeScript** - Type-safe code with shared config  
✅ **ESLint** - Code quality checks per package  
✅ **Prettier** - Consistent code formatting  
✅ **pnpm Workspaces** - Efficient dependency management  
✅ **Cross-package imports** - Use `@repo/*` to import  

---

## 🚀 Next Steps

1. **Add more packages** - Create new packages in `packages/`
2. **Add environment variables** - Create `.env` files
3. **Add database** - Install Mongoose, Prisma, etc.
4. **Add testing** - Install Jest or Vitest
5. **Add CI/CD** - Setup GitHub Actions

---

## 💡 Pro Tips

### Adding a New Package
```bash
mkdir -p packages/new-package/src
# Copy package.json, tsconfig.json, eslint.config.mts from another package
# Update the name in package.json
pnpm install
```

### Running Commands in Specific Package
```bash
pnpm --filter server dev
pnpm --filter @repo/shared build
```

### Debugging Turbo
```bash
pnpm build --verbose    # See detailed output
pnpm build --dry-run    # See what would run
```

---

## 🎉 You're Done!

Your monorepo is ready for production backend development with best practices built-in!
