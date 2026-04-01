# Documentation

This folder contains all documentation for the monorepo setup and configuration.

## 📚 Available Guides

### [MONOREPO_FROM_SCRATCH.md](./MONOREPO_FROM_SCRATCH.md)
**Complete step-by-step guide to create a monorepo from scratch**
- 15 detailed steps from empty folder to working monorepo
- Includes all configuration files (copy-paste ready)
- Perfect for starting a new project
- Covers Turbo, TypeScript, ESLint, and Prettier setup

### [MONOREPO_SETUP_GUIDE.md](./MONOREPO_SETUP_GUIDE.md)
**Comprehensive guide explaining the current monorepo configuration**
- Explains each configuration file and its purpose
- Simple English explanations of all settings
- How to use the monorepo commands
- IDE setup instructions
- Troubleshooting tips

### [TURBO_GUIDE.md](./TURBO_GUIDE.md)
**Everything about Turbo in this monorepo**
- What Turbo is and how it works
- How caching speeds up builds
- Common commands and usage
- Advanced features
- Troubleshooting Turbo issues

### [TYPESCRIPT_OUTPUT_FIX.md](./TYPESCRIPT_OUTPUT_FIX.md)
**Explains the TypeScript output configuration**
- Why generated files (.js, .d.ts, .map) should only be in dist/
- How the exclude patterns work
- Why we don't use rootDir in monorepos
- Troubleshooting TypeScript compilation issues

---

## 🚀 Quick Start

If you're new to this monorepo:
1. Start with **MONOREPO_SETUP_GUIDE.md** to understand the current setup
2. Use **TURBO_GUIDE.md** to learn about the build system
3. Reference **TYPESCRIPT_OUTPUT_FIX.md** if you see unexpected .js files

If you're creating a new monorepo:
1. Follow **MONOREPO_FROM_SCRATCH.md** step-by-step

---

## 📖 Common Questions

**Q: How do I add a new package?**  
See the "Next Steps" section in MONOREPO_FROM_SCRATCH.md

**Q: Why is my build so fast?**  
That's Turbo caching! Read TURBO_GUIDE.md to learn more

**Q: I see .js files in my src folder, why?**  
Check TYPESCRIPT_OUTPUT_FIX.md for the explanation and fix

**Q: How do I configure ESLint for my package?**  
See the ESLint sections in MONOREPO_SETUP_GUIDE.md
