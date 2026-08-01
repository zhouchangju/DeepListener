# T001 — Server Behavior Baseline

| Field | Value |
|---|---|
| Captured at | HEAD `960ec850e1d61697f1c8e77b429a717bb7f8b6a6` (short `960ec85`) |
| Branch | `main` (dirty worktree contains pre-existing onboarding/open-source/desktop-openspec edits — preserved, not part of this baseline) |
| Platform | darwin arm64, Node v24.15.0, npm 11.12.1 |
| Date | 2026-07-22 |

## 1. Verification Gate — GREEN at baseline

### `npm run verify:quick` (lint + test:ci)

```
ℹ tests 198   ℹ pass 198   ℹ fail 0   ℹ duration_ms 3151
EXIT=0
```

### `npm run verify` (lint + test:ci + build)

```
> deeplistener@0.2.0 verify
✓ Compiled successfully in 27.8s
Finished TypeScript in 3.2s
✓ Generating static pages using 7 workers (15/15) in 151ms
VERIFY_EXIT=0
```

**Baseline proof limit:** this establishes that the worktree *as it stands*
(including pre-existing uncommitted onboarding work) is green. Any W0 change
that turns this red is a regression attributable to the W0 change, not to
pre-existing state.

## 2. Route Inventory — Current Server Behavior

### Pages (8)

| Route | Render | File |
|---|---|---|
| `/` | static | `src/app/page.tsx` |
| `/setup` | dynamic | `src/app/setup/page.tsx` |
| `/library` | dynamic | `src/app/library/page.tsx` |
| `/practice/[id]` | dynamic | `src/app/practice/[id]/page.tsx` |
| `/review` | dynamic | `src/app/review/page.tsx` |
| `/vault` | dynamic | `src/app/vault/page.tsx` |
| `/dashboard` | static | `src/app/dashboard/page.tsx` |
| `/dashboard/symphony` | static | `src/app/dashboard/symphony/page.tsx` |

### API route handlers (13)

`/api/audio/export`, `/api/library/export`, `/api/review/grade`,
`/api/review/log`, `/api/sentence/[id]`, `/api/study-time`,
`/api/symphony/state`, `/api/track/[id]`, `/api/upload`, `/api/vault`,
`/api/vault/[id]`, `/api/vault/[id]/archive`, `/api/vault/export`.

Build manifest marks `/`, `/dashboard`, `/dashboard/symphony` as static (○);
the rest are dynamic server-rendered (ƒ). All API routes are dynamic (ƒ).

## 3. Path Behavior — Repository-Relative (the thing Desktop must NOT inherit)

This is the core coupling W0 must prove can be broken. Every mutable path
resolves relative to `process.cwd()`:

| Call site | Behavior |
|---|---|
| `src/lib/upload-policy.ts:97` | `buildUploadTarget({ rootDir = process.cwd() })` → writes audio under `<cwd>/public/uploads/` |
| `src/lib/upload-policy.ts:119` | `buildDerivedAudioTarget(videoFileName, rootDir = process.cwd())` → derived MP3 under `<cwd>/public/uploads/` |
| `src/lib/upload-policy.ts:131` | `resolveStoredUploadPath(audioUrl, rootDir = process.cwd())` → resolves stored audio URL back to `<cwd>/public/uploads/...` |
| `src/lib/upload-policy.ts:145` | `resolveStoredVideoPath(videoUrl, rootDir = process.cwd())` → resolves stored video URL back to `<cwd>/public/videos/...` |
| `src/lib/prisma.ts` | `new PrismaClient()` — reads `DATABASE_URL` from env; `prisma/schema.prisma` sets `url = env("DATABASE_URL")`, and `.env` has `DATABASE_URL="file:./dev.db"` which Prisma resolves relative to `schema.prisma` → `prisma/dev.db` |

**Implication for W0:** the standalone spike (T010/T012) must prove that
(a) Prisma can be pointed at an absolute `file:` URL under a `mktemp` data
root *before* the client is constructed, and (b) the upload/media paths can be
redirected via an explicit `rootDir`/data-root without editing source. T010's
health/Library checks and T012's CRUD are the executable proof.

## 4. Database / Media — Protected Data (read-only metadata only)

| Resource | Metadata captured (values NOT read) |
|---|---|
| `prisma/dev.db` | 47337472 bytes, sha256 `c5183268809cd4577e083c618a93195c7b7b2cd65c4b37f6863b4efdc9a08b1d`, mtime 2026-07-13 13:10 |
| `prisma/migrations/` | 14 migration dirs + `migration_lock.toml` (provider `sqlite`); migrations are frozen W0 inputs |
| `prisma/schema.prisma` | `prisma-client-js` generator, sqlite datasource, models: Track, Sentence, ReviewItem, ReviewLog, Category, TrackCategory, StudySession, ErrorTag |
| `public/uploads/` | 232 entries (`ls -A`, incl. `.gitkeep`); 231 non-hidden user audio |
| `public/videos/` | 2 entries (`ls -A`): `.gitkeep` + 1 original video (122699138 bytes) |
| `.env` / `.env.example` | exist; **values never read** |

## 5. Supported Import / Export Fixtures (current behavior)

From `src/lib/upload-policy.ts` and architecture docs:

- Audio extensions: `.aac .aif .aiff .flac .m4a .mp3 .mpeg .oga .ogg .opus .wav`
- Video extensions: `.mp4 .webm`
- Limits: audio ≤ 250 MB, video ≤ 1 GB
- Audio stored under `public/uploads/`; original video under `public/videos/`
  (local-only, excluded from sync); derived MP3 under `public/uploads/`
- Export routes (`/api/audio/export`, `/api/library/export`) resolve stored
  upload paths defensively against traversal (W2 contract T120/T121 hardens
  this into an authenticated byte-range route).

## 6. What This Baseline Proves and What It Does Not

**Proves:** the Server edition builds and passes its full gate at the frozen
commit; the learning loop's route/API surface is enumerated; every mutable
path is cwd-relative and therefore the desktop data-root decoupling is a real
change, not a no-op.

**Does NOT prove:** that Next standalone runs outside the repo (→ T010), that
Prisma works against a packaged disposable DB (→ T012), that FFmpeg can be
relocated (→ T022), or that Electron can sandbox the result (→ T030–T033).
Those are the W0 spike questions.
