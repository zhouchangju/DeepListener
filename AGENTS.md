# Repository Guidelines

## Project Structure & Module Organization
DeepListener is a Next.js App Router project. Route entry points live in `src/app` (`library`, `practice/[id]`, `review`, `vault`, `dashboard`) and API handlers live under `src/app/api`. Reusable UI is split between `src/components/ui` for primitives and `src/components/feature` for listening workflows such as `AudioPlayer` and `ShadowingConsole`. Shared logic lives in `src/lib`, with transcription providers in `src/lib/transcription`. Prisma schema lives in `prisma/`; with the default `DATABASE_URL="file:./dev.db"`, Prisma resolves the SQLite file as `prisma/dev.db`. Original audio and video-derived MP3 files live in `public/uploads/`; original local videos live in `public/videos/` and are intentionally excluded from remote sync. Project notes live in `docs/`.

For detailed architecture, environment config, and code organization, see [CLAUDE.md](./CLAUDE.md).

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production build; use this before major merges.
- `npm run lint`: run ESLint across the repo.
- `node --import tsx --test <paths>`: run targeted tests for touched routes, hooks, or components.
- `npx prisma migrate dev`: apply schema changes to the local SQLite database.
- `npx prisma studio`: inspect the local SQLite database resolved from `DATABASE_URL` (default: `prisma/dev.db`).
- `ffmpeg -version` / `ffprobe -version`: verify the media tools required for video audio extraction, embedded-subtitle detection, and export.
- `npm run sync`: rsync uploads and the local database to the remote backup target; use carefully. Prefer `npm run sync:safe` for interactive confirmation.
- `npm run setup` / `npm run symphony`: initialize and run the local Symphony orchestration scaffold.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation and semicolons. Prefer functional React components, colocated route files such as `page.tsx` and `route.ts`, and PascalCase for component files (`ReviewChart.tsx`). Keep utilities in lowercase filenames such as `prisma.ts` and `audio-utils.ts`. Follow the existing import alias style (`@/components/...`). Linting is defined in `eslint.config.mjs`; keep the repo at zero warnings.

## Testing Guidelines
The repo now includes colocated targeted tests under `src/` as `*.test.ts` and `*.test.tsx`. Every change should pass `npm run lint` and `npm run build`, and should also run the relevant targeted tests for the touched area with `node --import tsx --test <paths>`. Any Prisma change should additionally be verified with `npx prisma migrate dev`.

## DeepListener Optimization Harness
For refactors, performance work, migrations, deployment/basePath work, sync changes, Prisma/data changes, media import/export/transcription changes, quality-gate hardening, or non-trivial workflow changes, read `docs/agent-harness/README.md` before editing. Use Contract mode by default and Adversarial mode for anything touching `prisma/dev.db`, `public/uploads/`, `public/videos/`, `.env*`, `npm run sync`, migrations, deployment, or release-critical behavior. Preserve current behavior and protected data unless the sprint contract explicitly changes them.

## Karpathy-Inspired Agent Guidelines
Apply the Karpathy guideline set from `multica-ai/andrej-karpathy-skills` when writing, reviewing, or refactoring code in this repo.

- Think before coding: state assumptions, surface ambiguity, present tradeoffs, and ask when the request or code path is unclear.
- Prefer simplicity: implement the smallest solution that satisfies the request; avoid speculative features, one-off abstractions, and unnecessary configurability.
- Make surgical changes: touch only files and lines that trace to the task, match existing style, and avoid drive-by refactors or cleanup outside your own changes.
- Execute against verifiable goals: for non-trivial work, define the success criteria up front, run the narrow relevant checks first, then broader gates when the risk warrants it.

## Codex Self-Repair Rules
- Codex uses `AGENTS.md` as the primary project memory. Do not rely on `CLAUDE.md` for new Codex-only rules.
- When the user corrects a repeated mistake, add a concrete entry to "Learned from Mistakes" instead of adding broad personality guidance.
- Keep bugfix retry loops capped at 3 distinct attempts. After each attempt, run the failing command again; if all 3 fail, report what changed and what remains.
- Do not edit `.env*`, credential files, or local secrets. Ask the user to change local environment values themselves.
- Do not weaken lint, type, test, or build configuration to make a failing change pass. Fix the code or explain the blocker.
- Prefer scoped verification while editing, then run the broader checks (`npm run test:ci`, `npm run build`, and source-scoped ESLint) before claiming completion for code changes.

## Learned from Mistakes
- `npm run lint` can accidentally scan generated files under `.worktrees/**/.next`; keep generated worktrees out of ESLint scope and do not treat generated build output as source.
- Original videos under `public/videos/` are user data and local-only. Never add them to Git or remote sync; only commit `public/videos/.gitkeep`.
- Large videos should use the single-file `Import Media` path, which streams the raw request body. Batch media import still uses multipart parsing and is intended for smaller files.
- If Prisma reports an old migration that exists in the live database but is missing from `prisma/migrations/`, do not reset the database. Back up `prisma/dev.db`, compare the live schema, and use a targeted migration or repair path.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit prefixes such as `feat:` and `fix:`. Keep messages imperative and scoped to one change, for example `fix: exclude archived items from export count`. PRs should include a short summary, affected routes or modules, manual verification steps, linked issues when applicable, and screenshots or recordings for UI changes.

## Security & Configuration Tips
Keep API keys and proxy settings in `.env`; do not commit secrets or replace local values in examples. This repo assumes SQLite locally via `DATABASE_URL="file:./dev.db"`, which resolves to `prisma/dev.db` because the URL is relative to `prisma/schema.prisma`. Optional transcription credentials include `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, and `LINEAR_API_KEY`. Media import and audio export depend on `ffmpeg`/`ffprobe` being installed and available on `PATH`.
