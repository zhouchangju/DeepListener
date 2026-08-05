# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-04-desktop-data-portability |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | absent in this worktree | inspect metadata only | create, delete, overwrite, migrate, or sync |
| DATA-SAFE-002 | `public/uploads/` | present | inspect metadata only; no writes | delete, overwrite, or sync |
| DATA-SAFE-003 | `public/videos/` | present | inspect metadata only; no writes | delete, overwrite, or sync |
| DATA-SAFE-004 | `.env*` | absent in this worktree | do not read values or edit | any edit or secret output |

All implementation and tests in this session use `mkdtemp` disposable roots. The
active repository layout is never used as a backup or restore target.

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Desktop data is rooted by `DEEPLISTENER_DATA_DIR` | `src/lib/runtime-paths.ts` | backup/restore must use explicit roots |
| RUN-002 | Media identifiers are `/uploads/...` and `/videos/...` | `src/lib/media-storage.ts` | manifest stores portable keys, never absolute paths |
| RUN-003 | Node 22+ is available to the packaged service | `package.json` engines | SQLite integrity checks may use `node:sqlite` |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Desktop data portability | `src/lib/backup-service.ts`, `src/lib/diagnostics.ts`, focused API routes/tests, OpenSpec evidence | active DB/media, Prisma schema, migrations, signing, updater, real provider calls, UI redesign |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Legacy runtime paths and media identifiers remain unchanged | existing runtime/media tests plus full test suite |
| AC-PRESERVE-002 | Restore never activates an unverified or unconfirmed backup | restore service tests with corrupt and conflict fixtures |
| AC-PRESERVE-003 | Diagnostics never include secrets, notes, transcript text, or absolute private paths | diagnostics redaction tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Create a manifest-backed portable backup with database/media checksums | backup-service tests on disposable roots |
| AC-CHANGE-002 | Validate and stage a restore before explicit replacement activation | restore staging/conflict/rollback tests |
| AC-CHANGE-003 | Export a bounded, redacted diagnostics JSON document | diagnostics tests and API contract test |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/backup-service.test.ts src/lib/diagnostics.test.ts` | new services | yes | exits 0 |
| `node --import tsx --test src/app/api/diagnostics/route.test.ts` | API surface | yes | exits 0 |
| `npm run lint` | repository | yes | zero warnings/errors |
| `npm run build` | production bundle | yes | exits 0 |
| `npm run test:ci` | repository | yes | no new failures |

## Stop Conditions

- Never use `prisma/dev.db`, `public/uploads/`, or `public/videos/` as a fixture.
- Never edit `.env*` or use real provider credentials.
- Never activate a restore into the repository or an unknown root.
- Stop if the implementation would require deleting or overwriting user data
  without an explicit caller confirmation.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert only the files listed in this session | no user data is changed |
| Data | disposable roots are removed by tests | no active root is touched |
| Deployment | not in scope | no package or release artifact is published |
