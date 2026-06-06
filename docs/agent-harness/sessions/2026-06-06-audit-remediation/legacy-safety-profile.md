# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-audit-remediation |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unknown until verification; treated as protected | inspect path existence only | delete, overwrite, migrate, or remote copy without confirmation |
| DATA-SAFE-002 | `public/uploads/` | present in repo tree | inspect path existence only | delete, overwrite, or remote copy without confirmation |
| DATA-SAFE-003 | `.env*` | local secret files may exist | do not read values; do not edit | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md`, source tree | Route placement |
| RUN-002 | SQLite URL resolves relative to `prisma/schema.prisma` | `AGENTS.md`, harness README | Active DB is usually `prisma/dev.db` |
| RUN-003 | Package scripts and CI use npm semantics | `package.json`, CI workflow | Keep one lockfile policy |
| RUN-004 | Backup sync can write uploads and database remotely | harness README | Requires explicit user confirmation |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Setup safety | `bin/setup`, setup policy tests | Secret values, database contents |
| API contracts | `src/app/api/**`, `src/lib/api-response.ts` | API redesigns |
| Audio export | audio/library export routes and helpers | Audio transcoding feature changes |
| Dashboard/review dates | dashboard analytics, study time, review due windows | FSRS algorithm changes |
| Quality gate | Codex hook script and tests | External deployment automation |
| Docs | focused docs and changelog updates | Broad docs rewrite |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing routes, review queue, dashboard calculations, and exports remain functional for valid inputs | targeted tests and repo test runner |
| AC-PRESERVE-002 | Protected data and local secrets are not modified | git status and command log |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Setup script preserves `.env` and uses existing migrations safely | setup policy test |
| AC-CHANGE-002 | Mutations and exports fail with accurate client-visible errors | targeted tests |
| AC-CHANGE-003 | Internal server errors do not expose raw exception messages | API contract policy test |
| AC-CHANGE-004 | Hook allows read-only searches while still blocking risky backup sync execution | hook tests |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test <paths>` | touched domains | yes | exits 0 |
| repo node test runner | broader source tests | yes | exits 0 |
| source-scoped ESLint | source and scripts | yes | exits 0 |
| TypeScript no emit | repo types | yes | exits 0 |
| production build | repo build | attempt | exits 0 or documented local native blocker |

## Stop Conditions

Stop and ask the user before:

- Deleting, overwriting, migrating, or remotely copying `prisma/dev.db`
- Deleting, overwriting, or remotely copying `public/uploads/`
- Running the backup sync script
- Editing `.env*` or secrets
- Weakening lint, test, type, build, or safety rules
- Expanding the sprint into unrelated domains

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert touched files or branch commit | no data rollback expected |
| Data | N/A | no data mutation permitted |
| Deployment | N/A | no deployment config changes planned |
