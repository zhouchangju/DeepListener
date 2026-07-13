# Contributing to DeepListener

Thanks for considering a contribution. DeepListener is a solo-maintained, self-hostable learning
application with best-effort review, so this guide keeps the bar clear.

## Before You Start

- Check open issues for related work. If your change is non-trivial, open an issue first to avoid
  wasted effort.
- Read [docs/architecture.md](docs/architecture.md) and [docs/maintenance.md](docs/maintenance.md) to
  understand the routes, data model, upload/review flow, and data-safety boundary before changing
  core flows.

## Prerequisites

- Node.js 20+ and npm.
- **FFmpeg / ffprobe** (required for video audio extraction, subtitle probing, and audio export).
  Install from your platform package manager (`brew install ffmpeg` / `apt-get install ffmpeg`).
- A transcription provider API key (Deepgram / OpenAI / Google) configured in your local `.env` if
  you want to exercise transcription. See `.env.example`.

## Local Development

```bash
npm install
cp .env.example .env       # then fill in your own values
npx prisma migrate deploy  # initialize the SQLite schema
npm run dev                # start the Next.js dev server
```

Pre-commit verification:

```bash
npx prisma generate         # required once after install; produces Prisma namespace types
npm run lint
npm run build              # uses scripts/next-build.mjs (WASM fallback aware)
npm run test:ci            # node --import tsx --test based tests
```

Do not replace `npm run build` with a direct `next build` — the project build entry handles the
local Node WASM fallback.

## Making a Change

1. Add or update tests near the behavior you change, especially for upload safety, transcription
   providers, FSRS scheduling, audio export, and waveform/shadowing flows.
2. Keep `npm run lint`, `npm run build`, and `npm run test:ci` green before requesting review.
3. Do not commit generated or user data: `.env`, `dev.db`, `prisma/dev.db`, `public/uploads/*`,
   `public/videos/*`, `.next/`, `node_modules/`, `*.tsbuildinfo`, or agent/tool artifacts.
4. Do not hard-code deployment targets (hosts, accounts, paths) in committed files — read them from
   environment variables.
5. Do not bundle copyrighted media. DeepListener ships no sample media that could raise rights
   questions; tests use synthetic fixtures.

## Commit Style

- Use a short imperative subject, optionally prefixed with a type (`feat:`, `fix:`, `docs:`,
  `test:`, `chore:`).
- Keep changes semantic and reviewable.

## Scope of Support

This is a best-effort, solo-maintained project. Contributions are welcome but review turnaround may be
slow. The maintainer may decline changes that expand the maintenance surface significantly beyond the
single-user intensive-listening scope, or that weaken the data-safety boundary.

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
