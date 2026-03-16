# Repository Guidelines

## Project Structure & Module Organization
DeepListener is a Next.js App Router project. Route entry points live in `src/app` (`library`, `practice/[id]`, `review`, `vault`, `dashboard`) and API handlers live under `src/app/api`. Reusable UI is split between `src/components/ui` for primitives and `src/components/feature` for listening workflows such as `AudioPlayer` and `ShadowingConsole`. Shared logic lives in `src/lib`, with transcription providers in `src/lib/transcription`. Prisma schema and SQLite data live in `prisma/`, static assets in `public/`, and project notes in `docs/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production build; use this before major merges.
- `npm run lint`: run ESLint across the repo.
- `npx prisma migrate dev`: apply schema changes to the local SQLite database.
- `npx prisma studio`: inspect local data in `prisma/dev.db`.
- `npm run sync`: rsync uploads and the local database to the remote backup target; use carefully.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation and semicolons. Prefer functional React components, colocated route files such as `page.tsx` and `route.ts`, and PascalCase for component files (`ReviewChart.tsx`). Keep utilities in lowercase filenames such as `prisma.ts` and `audio-utils.ts`. Follow the existing import alias style (`@/components/...`). Linting is defined in `eslint.config.mjs`; warnings should still be treated as cleanup items.

## Testing Guidelines
There is no committed automated test suite yet. For now, every change should pass `npm run lint` and `npm run build`, and any Prisma change should be verified with `npx prisma migrate dev`. When adding tests, place them beside the feature as `*.test.ts` or `*.test.tsx` and focus on API routes, transcription adapters, and critical UI flows.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit prefixes such as `feat:` and `fix:`. Keep messages imperative and scoped to one change, for example `fix: exclude archived items from export count`. PRs should include a short summary, affected routes or modules, manual verification steps, linked issues when applicable, and screenshots or recordings for UI changes.

## Security & Configuration Tips
Keep API keys and proxy settings in `.env`; do not commit secrets or replace local values in examples. This repo assumes SQLite locally via `DATABASE_URL` and optional transcription credentials such as `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, and `GOOGLE_API_KEY`. Audio export depends on `ffmpeg` being installed and available on `PATH`.
