# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-desktop-legacy-migration-recovery |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; SHA-256 `171657900df49dd5a20f37f029923b33cce830467b831edf97e1e015deccaaff` | read and hash only | any content, size, or mtime change |
| DATA-SAFE-002 | Desktop data-root database | exists; SHA-256 `8db99a36dcadfb91d2c3f7d394ccd14748de54f3aee718a4f1d7422df5ea75f7` | read and hash only during implementation | any write before an explicitly reviewed upgrade operation |
| DATA-SAFE-003 | `public/uploads/` and `public/videos/` | 232 upload files and 2 video-tree files | read and count only | delete, overwrite, sync, or track local video data |
| DATA-SAFE-004 | `.env*` | `.env` and `.env.example` exist | names only | content read, edit, or disclosure |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Packaged Desktop runs frozen migrations from the standalone resource root | `desktop/main.js`, `src/instrumentation.ts` | Upgrade must use bundled migration names and order |
| RUN-002 | A pre-runner Desktop database can have current business tables without `_prisma_migrations` | reproduced from the reported profile on a disposable copy | The runner needs a narrow known-schema recovery path |
| RUN-003 | Unknown schema state must remain fail-closed | existing migration runner contract | Recovery may never infer history from table presence alone |
| RUN-004 | The failing profile matches migrations 1-15 and lacks only the final FSRS columns | read-only schema inspection and disposable-copy reproduction | A verified baseline may mark only migrations 1-15 before applying migration 16 |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Desktop database startup | `src/lib/migration-runner.ts`, its tests, `src/instrumentation.ts`, startup contract tests, focused docs | Prisma schema changes, active-data writes during implementation, media, sync, provider settings, FFmpeg packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Fresh profiles apply every bundled migration | migration-runner targeted test |
| AC-PRESERVE-002 | Tracked profiles stay idempotent and drift remains fail-closed | migration-runner targeted tests |
| AC-PRESERVE-003 | Unknown untracked schemas are rejected without baselining | new negative regression test |
| AC-PRESERVE-004 | Protected data and media remain unchanged during implementation | hashes, metadata, file counts, and Git status |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Exact known legacy Desktop schema is baselined through migration 15 and receives only pending migration 16 | failing-then-passing disposable database regression test |
| AC-CHANGE-002 | Startup log reports a redacted actionable migration error rather than only `Error` | focused startup contract test |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/migration-runner.test.ts src/lib/desktop-startup-contract.test.ts` | touched domain | yes | exits 0 |
| `npm run verify` | repository | yes | exits 0 |
| Desktop clean-profile and legacy-profile smoke on disposable roots | packaged runtime | yes | both start successfully |

## Stop Conditions

- Stop before writing the real Desktop data-root database; implementation and tests use disposable copies only.
- Do not touch `prisma/dev.db`, media, `.env*`, or sync paths.
- Unknown schema or migration drift must remain a hard failure.
- Do not expand into FFmpeg packaging in this sprint.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert only the migration runner, tests, instrumentation, and session docs | no active data is modified by code development |
| Data | restore the app-created pre-migration backup only after separate confirmation | no real-data repair is part of implementation |
| Deployment | discard the newly built local artifact | installed client remains unchanged until handoff approval |
