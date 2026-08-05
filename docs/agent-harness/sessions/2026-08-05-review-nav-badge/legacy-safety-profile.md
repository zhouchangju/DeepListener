# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-review-nav-badge |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | inspect status only | read-only test fixtures; no active data access | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | repository placeholder only | inspect status only | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | not edited | do not read values or edit | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md` | API route and client navigation placement |
| RUN-002 | Review queue is derived from local SQLite review state | `src/app/review/page.tsx` | Count endpoint must preserve due/relearning semantics |
| RUN-003 | AppShell is a client component | `src/components/app-shell/AppShell.tsx` | Badge loads through an explicit read-only API request |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Review navigation | `src/components/app-shell/**`, `src/app/api/review/count/**`, locale nav keys | Review scheduling algorithm, media files, provider setup, database schema |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Review page queue semantics and grade flow remain unchanged. | existing review tests + full verify |
| AC-PRESERVE-002 | Navigation remains reachable on desktop and mobile, including all existing destinations. | AppShell structural tests + browser check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Put Review before low-frequency Setup and expose the active route with `aria-current`. | AppShell structural test |
| AC-CHANGE-002 | Show a localized due-count badge when the read-only review count is available. | count route tests + NavReviewCount test |
| AC-CHANGE-003 | Refresh the badge after a successful review grade without exposing raw server errors. | ReviewClient/AppShell contract tests |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test <touched tests>` | Review nav and count route | yes | exits 0 |
| `npm run lint` | repo | yes | exits 0 |
| `npm run verify` | repo | yes | exits 0 |

## Stop Conditions

Stop before deleting, overwriting, migrating, or syncing `prisma/dev.db`,
`public/uploads/`, or `public/videos/`; editing `.env*`; running `npm run sync`;
or expanding this sprint into Review scheduling or data-model changes.

## Rollback

Revert the touched navigation component, count route, locale keys, tests, and
this session evidence. No data rollback is required because the endpoint is
read-only and no schema changes are made.
