---
name: deeplistener-dev-doctor
description: Diagnose local startup, dependency, and command failures in DeepListener. Use when dev server won't start, builds fail, or commands produce unexpected errors.
---

# DeepListener Dev Doctor

## Diagnosis Steps

### 1. Dev Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill existing process if needed
kill $(lsof -t -i :3000)

# Check Node.js version (requires 18+)
node --version

# Reinstall dependencies
rm -rf node_modules && npm install

# Try starting again
npm run dev
```

### 2. Build Fails

```bash
# Run lint first to isolate
npm run lint

# Run the project build (NOT raw next build)
npm run build

# Check for Prisma issues
npx prisma generate
npx prisma migrate dev
```

### 3. Prisma Issues

```bash
# After schema changes, MUST restart dev server
# Check database exists
ls -la prisma/dev.db

# Reapply migrations
npx prisma migrate dev

# Visual check
npx prisma studio
```

### 4. Test Failures

```bash
# Run all tests
npm run test:ci

# Run specific test file
node --import tsx --test src/path/to/file.test.ts

# Check test dependencies
npm ls
```

### 5. Proxy/Network Issues

- If OpenAI/Google transcription fails: check `HTTPS_PROXY` in `.env`
- Deepgram usually works without proxy
- Check proxy is running: `curl -x http://127.0.0.1:7890 https://api.openai.com`

### 6. Audio Export Issues

- Requires `ffmpeg` on PATH: `which ffmpeg`
- If missing: `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux)

## Common Gotchas

- Prisma client won't hot-reload after schema changes — restart dev server
- `.worktrees/**/.next` is generated output, not source
- `npm run lint` may scan worktree build output — exclude if needed
- zsh paths with brackets need quoting: `node --import tsx --test "src/app/practice/[id]/page.tsx"`
