# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-review-mobile-badge |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; inspect status only | disposable fixtures and read-only browser checks | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | exists; inspect status only | inspect status only | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | not edited | do not read values or edit | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | AppShell owns desktop and mobile global navigation | `src/components/app-shell/AppShell.tsx` | one navigation owner |
| RUN-002 | Review count is optional and read-only | existing `/api/review/count` contract | mobile badge must not block navigation |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Review mobile navigation | `src/components/app-shell/AppShell.tsx`, AppShell tests | Review scheduling, API, schema, media, provider setup |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Mobile menu keeps all five destinations and active-route semantics | AppShell structural test |
| AC-PRESERVE-002 | Optional badge remains silent when count is unavailable or zero | NavReviewCount contract test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Mobile Review menu item shows the same optional localized due badge as desktop navigation | AppShell structural test and browser smoke |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/app-shell/AppShell.test.ts src/components/app-shell/NavReviewCount.test.ts` | touched navigation | yes | exits 0 |
| `npm run lint` | repo | yes | exits 0 with zero warnings |
| `npm run verify` | repo | yes | exits 0 |
| `git diff --check` | worktree | yes | exits 0 |

## Stop Conditions

Do not touch active data, secrets, sync, review scheduling, or API/schema code.

## Rollback

Revert the AppShell mobile-link and test changes. No data rollback is needed.
