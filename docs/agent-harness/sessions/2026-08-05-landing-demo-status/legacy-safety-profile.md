# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-landing-demo-status |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; inspect status only | no data operations | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | exists; inspect status only | no data operations | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | not edited | do not read values or edit | edit or print secrets |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Landing Demo status accessibility | `src/app/page.tsx`, `src/app/page.first-success.test.ts` | Demo API, database, media, provider, packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Demo request, readiness redirect, and normal landing page remain unchanged | page structural tests and full verify |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Demo loading state is exposed with `aria-busy` and a concise polite status | targeted page test and source inspection |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/page.first-success.test.ts src/app/first-session-accessibility.test.ts` | landing/accessibility | yes | exits 0 |
| `npm run verify` | repo | yes | exits 0 |
| `git diff --check` | worktree | yes | exits 0 |

## Stop Conditions

Do not touch active data, secrets, sync, Demo assets, or API behavior.

## Rollback

Revert `src/app/page.tsx`, its targeted test, and this session evidence. No data rollback is needed.
