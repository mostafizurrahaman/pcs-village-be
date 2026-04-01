# Turbo Integration Guide

## 🚀 What is Turbo?

Turbo is a high-performance build system for JavaScript and TypeScript monorepos. It makes your monorepo **faster** by:

- **Caching builds** - Never build the same thing twice
- **Parallel execution** - Run tasks across packages simultaneously
- **Smart scheduling** - Only rebuild what changed
- **Remote caching** - Share cache with your team (optional)

---

## ✅ What We've Set Up

Your monorepo now uses Turbo for all major tasks:

### Root Scripts (using Turbo)
```bash
pnpm dev          # Run dev servers (with Turbo)
pnpm build        # Build all packages (cached)
pnpm lint         # Lint all packages (cached)
pnpm lint:fix     # Fix linting issues
pnpm type-check   # Check TypeScript (cached)
pnpm clean        # Clean all build artifacts
```

### Package Scripts
Each package now has these scripts:
- `build` - Compile TypeScript
- `lint` - Run ESLint
- `lint:fix` - Auto-fix linting
- `type-check` - Check types without building
- `clean` - Remove build artifacts

---

## 📋 Turbo Pipeline Configuration

**File:** `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,        // Don't cache dev (it's a watch mode)
      "persistent": true     // Keep running
    },
    "build": {
      "dependsOn": ["^build"],   // Build dependencies first
      "outputs": ["dist/**"],    // Cache these folders
      "cache": true              // Enable caching
    },
    "lint": {
      "dependsOn": ["^build"],   // Lint after building
      "cache": true              // Cache results
    },
    "type-check": {
      "dependsOn": ["^build"],   // Type-check after building
      "cache": true              // Cache results
    }
  }
}
```

**What each setting means:**
- `dependsOn: ["^build"]` - Run `build` in dependencies first
- `outputs` - Which folders to cache
- `cache: true` - Enable caching for this task
- `persistent: true` - Task keeps running (like dev servers)

---

## 🎯 How Turbo Works

### Example: Building Your Monorepo

```bash
pnpm build
```

**What Turbo does:**

1. **Analyzes dependencies**
   - `server` depends on `@repo/db` and `@repo/shared`
   - `@repo/db` depends on `@repo/shared`

2. **Creates build order**
   - Build `@repo/shared` first
   - Build `@repo/db` second
   - Build `server` last

3. **Runs in parallel** (when possible)
   - If nothing changed, uses cache ⚡
   - Only rebuilds what changed

4. **Caches results**
   - Next time, if nothing changed: **instant!** 🚀

---

## 💡 Common Commands

### Development
```bash
# Run dev server (server package only)
pnpm dev

# This runs: turbo dev
# Turbo finds packages with "dev" script and runs them
```

### Building
```bash
# Build all packages
pnpm build

# First time: Builds everything
# Second time: Uses cache (instant!)
# After changes: Only rebuilds changed packages
```

### Linting
```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Turbo runs lint in parallel across all packages
```

### Type Checking
```bash
# Check TypeScript in all packages
pnpm type-check

# Turbo caches results - super fast on second run!
```

### Cleaning
```bash
# Remove all build artifacts and caches
pnpm clean

# This removes:
# - dist/ folders
# - .turbo/ cache
# - node_modules/ (optional)
```

---

## 🔥 Turbo Benefits

### 1. **Speed**
```bash
# First build
pnpm build
# ✓ @repo/shared built in 2.5s
# ✓ @repo/db built in 1.8s  
# ✓ server built in 3.2s
# Total: 7.5s

# Second build (nothing changed)
pnpm build
# ✓ @repo/shared (cached)
# ✓ @repo/db (cached)
# ✓ server (cached)
# Total: 0.1s ⚡
```

### 2. **Smart Rebuilds**
```bash
# Change one file in @repo/shared
pnpm build

# Turbo rebuilds:
# ✓ @repo/shared (changed)
# ✓ @repo/db (depends on shared)
# ✓ server (depends on db and shared)

# Doesn't rebuild:
# ✗ Other packages (not affected)
```

### 3. **Parallel Execution**
```bash
# Turbo runs tasks in parallel when possible
pnpm lint

# Runs simultaneously:
# ⚡ Linting @repo/shared
# ⚡ Linting @repo/db  
# ⚡ Linting server

# Much faster than sequential!
```

---

## 📊 Understanding Cache

### What Gets Cached?
- Build outputs (`dist/` folders)
- Lint results
- Type-check results

### When Cache is Used?
Turbo uses cache when:
- ✅ Source code hasn't changed
- ✅ Dependencies haven't changed
- ✅ Configuration hasn't changed

### Where is Cache Stored?
- Local: `.turbo/` folder in each package
- You can also use remote caching (Vercel)

---

## 🛠️ Advanced Usage

### Run Task in Specific Package
```bash
# Run build in server only
pnpm --filter server build

# Run dev in server only  
pnpm --filter server dev
```

### Force Rebuild (Ignore Cache)
```bash
# Build everything, ignore cache
pnpm build --force

# Useful when cache is corrupted
```

### See What Turbo is Doing
```bash
# Verbose output
pnpm build --verbose

# Shows:
# - Which tasks are running
# - Cache hits/misses
# - Build times
```

### Dry Run
```bash
# See what would run, without running
pnpm build --dry-run

# Shows execution plan
```

---

## 🎨 Turbo Output

When you run `pnpm build`, you'll see:

```
• Packages in scope: @repo/db, @repo/shared, server
• Running build in 3 packages
• Remote caching disabled

@repo/shared:build: cache miss, executing...
@repo/shared:build: > tsc
@repo/shared:build: ✓ Built in 2.1s

@repo/db:build: cache miss, executing...
@repo/db:build: > tsc  
@repo/db:build: ✓ Built in 1.5s

server:build: cache miss, executing...
server:build: > tsc
server:build: ✓ Built in 2.8s

Tasks:    3 successful, 3 total
Cached:   0 cached, 3 total
Time:     6.4s
```

Second run (with cache):
```
@repo/shared:build: cache hit, replaying output...
@repo/db:build: cache hit, replaying output...
server:build: cache hit, replaying output...

Tasks:    3 successful, 3 total
Cached:   3 cached, 3 total
Time:     0.2s >>> FULL TURBO ⚡
```

---

## 🔍 Troubleshooting

### Cache Not Working?
```bash
# Clear Turbo cache
rm -rf .turbo
pnpm build

# Or use --force flag
pnpm build --force
```

### Task Not Running?
Check that the package has the script:
```bash
# Make sure package.json has the script
cat packages/shared/package.json | grep "build"
```

### Dependency Issues?
```bash
# Clean everything and reinstall
pnpm clean
pnpm install
pnpm build
```

---

## 📚 Quick Reference

| Command | What It Does |
|---------|-------------|
| `pnpm dev` | Run development servers |
| `pnpm build` | Build all packages (cached) |
| `pnpm lint` | Lint all packages (cached) |
| `pnpm type-check` | Check TypeScript (cached) |
| `pnpm clean` | Remove all build artifacts |
| `pnpm build --force` | Build without cache |
| `pnpm build --verbose` | Show detailed output |
| `pnpm build --dry-run` | Show what would run |
| `pnpm --filter server build` | Build specific package |

---

## 🎉 Summary

You now have Turbo integrated into your monorepo:

✅ **Faster builds** - Caching saves time  
✅ **Parallel execution** - Tasks run simultaneously  
✅ **Smart rebuilds** - Only rebuild what changed  
✅ **Better DX** - Cleaner output, faster feedback  

**Pro Tip:** The more you use Turbo, the faster it gets! The cache builds up over time.

Happy building! 🚀
