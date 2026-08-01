# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | `2026-07-22-open-source-onboarding` |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-07-22 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists | metadata-only inspection | delete, overwrite, migrate, or sync |
| DATA-SAFE-002 | `public/uploads/` | exists | metadata-only inspection | delete, overwrite, or sync |
| DATA-SAFE-003 | `public/videos/` | exists | metadata-only inspection | delete, overwrite, commit, or sync |
| DATA-SAFE-004 | `.env` | exists | presence check only | read values, edit, or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md`, source tree | Landing and setup use App Router pages. |
| RUN-002 | SQLite file URLs resolve relative to `prisma/schema.prisma` | `AGENTS.md`, Prisma behavior | Setup must report the correct default database path. |
| RUN-003 | FFmpeg is needed for video processing and export, not basic audio browsing | upload and media-processing source | Diagnostic explains partial usability rather than blocking the whole app. |
| RUN-004 | The app has no authentication | `SECURITY.md` | Setup must warn against direct public exposure. |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Onboarding and environment readiness | `/`, `/setup`, Library empty state, single-upload error guidance, onboarding docs | Prisma schema/data, media files, provider network calls, Docker, demo media, AI learning features, sync/deployment |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing Library and practice routes remain available | production build and route inspection |
| AC-PRESERVE-002 | Diagnostics never mutate protected data or reveal credential values | source review and protected-resource metadata check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Root route explains the product and links to readiness and Library | page test and build |
| AC-CHANGE-002 | Setup route gives actionable, provider-aware readiness checks | unit tests and build |
| AC-CHANGE-003 | Empty Library and upload errors direct users to recovery actions | targeted tests |

## Stop Conditions

- Stop before any protected-data write, migration, sync, `.env` edit, provider network call, or unrelated feature expansion.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code and docs | Revert only files listed in the sprint contract | No database or media rollback is needed. |
| Data | N/A | This sprint performs no data writes or migrations. |
| Deployment | N/A | No deployment configuration changes. |
