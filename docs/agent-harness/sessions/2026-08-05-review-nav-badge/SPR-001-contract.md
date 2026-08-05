# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-review-nav-badge |
| Domain | Review / API / UI |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Learner-oriented global navigation | `AppShell.tsx`, mobile menu | Library → Review → Vault → Analytics → Setup; active route is announced |
| FEAT-002 | Read-only review queue count | `/api/review/count`, `NavReviewCount.tsx` | Count matches the Review page's due/relearning semantics and is localized |
| FEAT-003 | Post-grade badge refresh | `ReviewClient.tsx` + nav badge | Successful grading refreshes the badge; failed grading does not fabricate a count |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | FSRS scheduling or review database schema | Existing behavior must remain stable |
| OOS-002 | Provider, media, Desktop packaging, or protected user data | Separate OpenSpec lanes and safety boundaries |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | All five destinations remain available in desktop and mobile navigation. | AppShell test + browser check |
| AC-PRESERVE-002 | Review page's due/relearning definition remains the source of truth. | count route test fixture parity |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Active navigation uses `aria-current="page"` and a visible state. | source contract test |
| AC-CHANGE-002 | Review shows a numeric due badge only when count is known and positive. | component contract test |
| AC-CHANGE-003 | Grade success emits a refresh signal for the badge. | ReviewClient source contract test |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged; tests use disposable fixtures |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/api/review/count/route.test.ts src/components/app-shell/NavReviewCount.test.ts src/components/app-shell/AppShell.test.ts src/app/review/ReviewClient.test.ts` | targeted regression | yes | exits 0 |
| `npm run verify` | broader regression | yes | exits 0 |
| `git diff --check` | whitespace check | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library` | Observe desktop nav with a nonzero disposable review queue | Review appears before Setup, active Library state is announced, and Review badge is visible when count is available |
| BV-002 | `/review` | Open Review and grade one item, then return to another route | Review badge refreshes without a full reload or raw error text |

## Stop Conditions

Do not touch active data, secrets, sync, or the review scheduling algorithm. If
the count cannot be computed without changing the existing queue semantics,
stop and document the mismatch instead of approximating it.

## Rollback

Revert the navigation, count route, locale, and test changes. No data rollback
is needed.
