# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-legacy-import |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; not opened by this sprint | metadata/status checks only | any read/write/migrate/overwrite |
| DATA-SAFE-002 | `public/uploads/` | exists; not opened by this sprint | metadata/status checks only | any write/delete/overwrite |
| DATA-SAFE-003 | `public/videos/` | exists or absent; not opened by this sprint | metadata/status checks only | any write/delete/overwrite |
| DATA-SAFE-004 | `.env*` | not read or edited | none | any read of values or edit |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Legacy layout is `prisma/dev.db` + `public/uploads` + `public/videos`; Desktop layout is an explicit root. | `runtime-paths.ts` | tests must construct both layouts under temp roots |
| RUN-002 | Backup/restore primitives validate checksums and SQLite integrity before activation. | `backup-service.ts` | reuse existing containment and activation contracts |
| RUN-003 | Offline migration runner accepts an explicit DB path and migrations directory. | `migration-runner.ts` | migration runs only on staged copy |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Legacy import | `src/lib/legacy-import.ts`, `src/lib/legacy-import.test.ts`, OpenSpec evidence | UI/API wiring, Prisma schema changes, active data, secrets, packaging, sync |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Source legacy database and media remain byte-identical after success or failure. | disposable fixture hashes before/after |
| AC-PRESERVE-002 | Target root is untouched until explicit activation. | staged/failure tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Copy a selected legacy layout into operation-owned staging, migrate only the copy, and expose an explicit activation step. | targeted contract tests |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/legacy-import.test.ts` | touched domain | yes | exits 0 |
| `npm run lint` | repo | yes | exits 0 |
| `npm run build` | repo | yes | exits 0 |
| `npm run test:ci` | repo | yes | exits 0 or documented Windows capability skips |

## Stop Conditions

- Stop before any operation targeting the active `prisma/dev.db`, `public/uploads/`, `public/videos/`, or `.env*`.
- Stop before adding UI/API wiring or schema changes; those require a separate contract.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert `src/lib/legacy-import.ts` and its test/docs | no active data touched |
| Data | discard only operation-owned temp roots | source and target roots remain unchanged before activation |
