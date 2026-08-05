# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-demo-spoken-audio |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | present/unknown; not inspected for mutation | read-only status checks only | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | present/unknown; not touched | no operations required | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | not read or edited | none | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Demo audio is served from `public/demo/demo-listening.mp3` | `src/lib/demo-seed.ts` | URL remains stable |
| RUN-002 | Demo transcript cues are bundled and provider-free | `src/lib/demo-seed.ts`, `public/demo/PROVENANCE.md` | Timeline must match the shipped clip |
| RUN-003 | The replacement script requires `ffmpeg` and `ffprobe` | `scripts/replace-demo-audio.mjs` | Validate encoded duration and checksum |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Audio / Demo release asset | `public/demo/**`, `src/lib/demo-seed.ts`, replacement script, related tests/docs | Prisma data, uploads, providers, UI redesign, deployment vendor binaries |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Demo URL, stable track ID, DEMO ownership and provider-free seeding remain unchanged | `src/lib/demo-seed.test.ts` |
| AC-PRESERVE-002 | Existing audio replacement remains atomic and checksum-bound | replacement script run and provenance checksum |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Replace the synthetic busy-tone fixture with six spoken-English cues and matching offsets | duration/timeline validation, audio metadata, updated seed test |
| AC-CHANGE-002 | Record reproducible source and redistribution rights | `public/demo/PROVENANCE.md` |
| AC-CHANGE-003 | Make replacement script work with current FFmpeg 9 `ffprobe` syntax | targeted script run |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/demo-seed.test.ts src/lib/desktop-packaging-contract.test.ts` | demo and release preflight | yes | exits 0 |
| `npm run lint` | repo | yes | exits 0 warnings/errors |
| `npm run test:ci` | repo | yes | exits 0 |
| `npm run build` | repo | yes | exits 0 |
| `ffprobe` metadata + SHA-256 | bundled asset | yes | mono MP3, ~18.4s, checksum matches provenance |

## Stop Conditions

- Do not touch `prisma/dev.db`, `public/uploads/`, `.env*`, or run `npm run sync`.
- Do not claim public desktop readiness: target-specific redistributable FFmpeg assets remain a separate gate.
- Stop if source/voice rights cannot be evidenced as redistributable.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Audio/code/docs | restore the pre-change files from `C:\Users\Administrator\AppData\Local\Temp\deeplistener-demo-backup-a805e07a5b284fa998ee638246aac0dc`, or revert the scoped patch | backup contains only demo audio, seed, and provenance; no user data |
| Data | N/A | no database operation performed |
| Deployment | N/A | no packaging/deployment operation performed |
