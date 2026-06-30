---
name: deeplistener-onboarding
description: Onboard to the DeepListener project. Read the project map, commands, architecture, and current risks before making changes.
---

# DeepListener Onboarding

## Project Summary

DeepListener is a Next.js 16 App Router English listening practice platform with:
- Multi-model transcription (Deepgram, OpenAI, Google)
- Interactive waveform visualization (WaveSurfer.js)
- FSRS-4.5 spaced repetition review system
- Shadowing practice with zero-delay audio slicing
- SQLite database via Prisma

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
```

## Architecture

- **Routes**: `src/app/` — library, practice/[id], review, vault, dashboard
- **API**: `src/app/api/` — upload, track, sentence, review, vault, audio export, study-time
- **Components**: `src/components/ui/` (primitives) + `src/components/feature/` (workflows)
- **Lib**: `src/lib/` — prisma, fsrs, api helpers, transcription providers
- **Database**: `prisma/schema.prisma` → SQLite at `prisma/dev.db`

## Critical Rules

1. **Zero data loss** — never delete/overwrite `prisma/dev.db` or `public/uploads/` without confirmation
2. **Use `npm run build`** — never raw `next build` (uses scripts/next-build.mjs wrapper)
3. **Restart after Prisma schema changes** — client won't hot-reload
4. **Run verification**: `npm run lint` + `npm run build` + targeted tests

## Current Risks

- Multiple `.worktrees/` directories with duplicate source
- `npm run sync` overwrites remote state without confirmation
- Test coverage ratio is 0.13 (moderate)
- No hooks or MCP configs for automated safety gates
