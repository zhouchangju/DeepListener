# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-release-docs-screenshots |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; inspect only | read/inspect | delete, overwrite, migrate, sync without confirmation |
| DATA-SAFE-002 | `public/uploads/` | exists; inspect only | read/inspect | delete, overwrite, sync without confirmation |
| DATA-SAFE-003 | `.env*` | present/unknown values | do not read values or edit | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md`, codebase inventory | browser routes |
| RUN-002 | Desktop distribution is macOS arm64 alpha | `desktop/electron-builder.yml`, desktop docs | README platform wording |
| RUN-003 | From-source run is the Windows path today | package scripts and README | bilingual onboarding wording |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Release documentation and visual README introduction | `README.md`, `README.zh-CN.md`, `SUPPORT.md`, `docs/**` current docs, `public/demo/readme-core-workflow*` | application logic, Prisma schema/data, uploads/videos, `.env*`, sync, unrelated historical logs |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | user data and media remain untouched | git status/path checks |
| AC-PRESERVE-002 | Mac desktop packaging claims match scripts/config | packaging audit and tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | bilingual docs state Mac-only desktop support and Windows from-source path | file review and targeted docs checks |
| AC-CHANGE-002 | README shows a real core-workflow screenshot composite near the top | browser evidence and image inspection |

## Stop Conditions

- Do not delete/overwrite `prisma/dev.db`, `public/uploads/`, or `public/videos/`.
- Do not edit `.env*` or run `npm run sync`.
- Do not delete branches until their merged/reachable status is verified.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Documentation/assets | revert the release commit or restore touched files | no protected data touched |
| Branch cleanup | recreate a deleted ref from the recorded commit if needed | only delete fully merged/unneeded refs |
