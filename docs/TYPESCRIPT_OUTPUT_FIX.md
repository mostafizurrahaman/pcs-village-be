# TypeScript Output Configuration - Fixed

## ✅ Problem Solved

**Issue:** TypeScript was generating `.js` and `.js.map` files inside `src/` folders instead of only in `dist/` folders.

**Root Cause:** Without `rootDir` set, TypeScript can sometimes output files in unexpected locations. However, setting `rootDir` causes issues in monorepos when packages import from each other.

**Solution:** 
1. Removed `rootDir` to allow cross-package imports
2. Added `.js` and `.js.map` to the `exclude` pattern in tsconfig
3. Cleaned up existing generated files from src folders

---

## 📁 Current Configuration

### Each Package tsconfig.json

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

**Key Points:**
- `outDir: "./dist"` - Compiled files go here
- `exclude` - Prevents TypeScript from processing ALL generated files:
  - `**/*.js` - Compiled JavaScript files
  - `**/*.js.map` - JavaScript source maps
  - `**/*.d.ts` - TypeScript declaration files
  - `**/*.d.ts.map` - Declaration source maps
- No `rootDir` - Allows importing from other workspace packages

---

## 🎯 What This Achieves

### ✅ Clean Source Folders
- `src/` folders contain ONLY TypeScript files
- No `.js` or `.js.map` files polluting your source code

### ✅ Proper Build Output
- All compiled files go to `dist/` folders
- Source maps are generated in `dist/`
- Declaration files (`.d.ts`) are in `dist/`

### ✅ Monorepo Compatibility
- Packages can import from each other without errors
- TypeScript doesn't complain about files outside `rootDir`
- Turbo caching works correctly

---

## 🔍 Verification

### Check for Stray Generated Files
```bash
# This should return nothing (or exit code 1)
find packages -name "*.js" -o -name "*.js.map" -o -name "*.d.ts" -o -name "*.d.ts.map" | grep -v node_modules | grep -v dist
```

### Check Build Output
```bash
# Should show all compiled files in dist/
ls packages/shared/dist
# Output: app/ index.d.ts index.d.ts.map index.js index.js.map
```

### Build Test
```bash
pnpm build
# All packages build successfully
# Files only in dist/ folders
```

---

## 📚 Understanding the Config

### Why No `rootDir`?

In a monorepo, packages import from each other:
```typescript
// In packages/db/src/user.model.ts
import { hashPassword } from '@repo/shared'
```

When TypeScript compiles this:
- It follows the import to `packages/shared/src/...`
- With `rootDir: "./src"` set, TypeScript complains because shared files are outside `packages/db/src`
- Without `rootDir`, TypeScript is more flexible

### Why Exclude Generated Files?

```json
"exclude": ["**/*.js", "**/*.js.map", "**/*.d.ts", "**/*.d.ts.map"]
```

TypeScript generates 4 types of files when compiling:
1. **`.js`** - Compiled JavaScript code
2. **`.js.map`** - Source maps for debugging JavaScript
3. **`.d.ts`** - Type declaration files (for type checking)
4. **`.d.ts.map`** - Source maps for declaration files

Excluding these prevents TypeScript from:
- Trying to compile already-compiled files
- Getting confused if generated files accidentally end up in src
- Processing source maps as source files
- Creating duplicate outputs

### Where Do Files Go?

**Without `rootDir`:**
- TypeScript infers the common root of all input files
- In our case, it's the package's src folder
- Output goes to `dist/` with the same structure as `src/`

**Example:**
```
packages/shared/src/app/utils/jwt.utils.ts
→ packages/shared/dist/app/utils/jwt.utils.js
```

---

## 🚀 Best Practices

### 1. Always Clean Before Building
```bash
pnpm clean  # Removes all dist folders
pnpm build  # Fresh build
```

### 2. Add to .gitignore
```gitignore
# Build outputs
dist/

# Generated files (only in src, not in dist or node_modules)
src/**/*.js
src/**/*.js.map
src/**/*.d.ts
src/**/*.d.ts.map
```

### 3. Use Turbo for Caching
```bash
pnpm build  # First build
pnpm build  # Second build uses cache - instant!
```

---

## ❓ FAQ

### Q: Why do I see .js, .d.ts, or .map files in my src folder?
**A:** You probably ran `tsc` directly without the proper exclude patterns. Run the clean command to remove them:
```bash
find packages -name "*.js" -o -name "*.js.map" -o -name "*.d.ts" -o -name "*.d.ts.map" | grep -v node_modules | grep -v dist | xargs rm
```

### Q: Can I use `rootDir`?
**A:** Not recommended in monorepos where packages import from each other. It causes "file not under rootDir" errors.

### Q: What about the tsconfig from your other project?
**A:** That config is good for standalone projects. In monorepos, we need more flexibility for cross-package imports.

### Q: How do I prevent this in the future?
**A:** 
1. Always use `pnpm build` (which uses the correct tsconfig)
2. Don't run `tsc` directly without checking the config
3. The `exclude` patterns will prevent most issues

---

## 🎉 Summary

✅ **No more generated files in src folders**  
✅ **All compiled files (.js, .d.ts, .map) go to dist/**  
✅ **Cross-package imports work perfectly**  
✅ **Turbo caching works correctly**  
✅ **Clean, maintainable monorepo structure**  

Your TypeScript configuration is now optimized for monorepo development!
