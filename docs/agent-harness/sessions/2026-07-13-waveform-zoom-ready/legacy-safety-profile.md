# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-07-13-waveform-zoom-ready |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-07-13 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists (47,337,472 bytes) | read-only inspection | delete, overwrite, migrate, or sync |
| DATA-SAFE-002 | `public/uploads/` | exists (232 files) | read-only inspection | delete, overwrite, or sync |
| DATA-SAFE-003 | `public/videos/` | exists (2 files) | read-only inspection | delete, overwrite, commit, or sync |
| DATA-SAFE-004 | `.env*` | `.env` exists | do not read values or edit | any content access or edit |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md` | Practice route remains unchanged |
| RUN-002 | WaveSurfer 7.12.1 requires decoded data before `zoom()` | installed package source | Zoom must use decoded-data readiness |
| RUN-003 | Video practice uses an external video element plus pre-decoded peaks | `AudioPlayer.tsx`, `useWaveSurfer.ts` | Media readiness and waveform readiness can diverge |
| RUN-004 | `npm run sync` writes protected data remotely | harness documentation | Sync is excluded |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Audio | `src/components/feature/audio-player/useWaveSurfer.ts`, its targeted test, this session | player redesign, Prisma, uploads, videos, environment, sync, deployment |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Ready waveform instances still receive zoom updates | targeted behavior test |
| AC-PRESERVE-002 | Loop and playback-rate synchronization remain intact | existing targeted tests and broader gates |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Do not call `zoom()` until decoded waveform data exists | failing-then-passing targeted test |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/feature/audio-player/useWaveSurfer.test.ts` | regression | yes | exits 0 |
| `npm run test:ci` | repo | yes | exits 0 |
| source-scoped ESLint | touched source | yes | exits 0 |
| `npm run build` | production compilation | yes | exits 0 |

## Stop Conditions

- Stop before any write to `prisma/dev.db`, `public/uploads/`, `public/videos/`, or `.env*`.
- Stop before `npm run sync`, migration, or deployment work.
- Stop if the fix requires changing player architecture outside the hook.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | Revert the hook and its regression test | No data mutation |
| Data | N/A | Protected data remains untouched |
| Deployment | N/A | No deployment change |
