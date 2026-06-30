---
name: deeplistener-quality-gate
description: Run and interpret lint, typecheck, test, and build gates for DeepListener. Use before claiming any code change is complete.
---

# DeepListener Quality Gate

## Required Gates (in order)

### 1. Lint

```bash
npm run lint
```

- Must pass with zero warnings
- Uses `eslint.config.mjs` configuration
- Exclude `.worktrees/**/.next` generated output

### 2. Build

```bash
npm run build
```

- Uses `scripts/next-build.mjs` wrapper (NOT raw `next build`)
- Production build must succeed before merges
- Check for TypeScript errors, missing imports, and runtime issues

### 3. Targeted Tests

```bash
node --import tsx --test <paths>
```

- Run tests for all touched files
- Pattern: `*.test.ts` and `*.test.tsx` colocated with source

### 4. Full Test Suite

```bash
npm run test:ci
```

- Runs via `scripts/run-node-tests.mjs`
- Run for broader changes or before final merge

### 5. Prisma (if schema changed)

```bash
npx prisma migrate dev
```

- Only when `prisma/schema.prisma` was modified
- Restart dev server after schema changes

## Interpretation

| Gate | Pass | Fail Action |
|---|---|---|
| Lint | 0 warnings, 0 errors | Fix lint issues; do not suppress |
| Build | Exit 0 | Read error output; fix TypeScript/build issues |
| Tests | All pass | Read failure output; fix test or implementation |
| Prisma | Migration applies cleanly | Check schema; resolve conflicts |

## Rules

- Do not weaken lint, test, type, or build config to make changes pass
- Do not skip gates; document reason if genuinely not applicable
- Report actual command output, never fabricated results
- A change is not "complete" until all applicable gates pass
