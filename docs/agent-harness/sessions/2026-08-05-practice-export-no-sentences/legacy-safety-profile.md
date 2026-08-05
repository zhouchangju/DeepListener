# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-practice-export-no-sentences |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | not touched | read-only checks only | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | not touched | read-only checks only | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | not read or edited | none | edit or print secrets |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Audio export | `src/app/api/audio/export/**`, `src/lib/export-file-policy.ts`, related tests/docs | Prisma schema, database contents, upload pipeline, provider credentials |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | `all`, `due`, and `filtered` continue to export captured ReviewItems | targeted query/export tests |
| AC-PRESERVE-002 | Upload path traversal checks remain fail-closed | export-file-policy tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | `track` export includes all sentences, including uncaptured Demo sentences | disposable SQLite end-to-end export smoke |
| AC-CHANGE-002 | Bundled `/demo/` audio is resolved safely for server-side FFmpeg | policy tests and smoke |

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code/docs | revert the scoped files or commit | no persisted data changed |
| Data | N/A | temporary smoke database only |
