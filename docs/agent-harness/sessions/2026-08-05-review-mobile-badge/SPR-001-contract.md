# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-review-mobile-badge |
| Domain | Review navigation / UI |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Mobile Review due badge parity | `AppShell.tsx`, AppShell test | Mobile Review menu item exposes the localized positive due count when known, without blocking or duplicating review semantics |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Review queue calculation and API | Existing read-only count contract is the source of truth |
| OOS-002 | Provider, media, desktop packaging, and protected data | Separate OpenSpec lanes |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Mobile menu retains Library, Review, Vault, Analytics, and Setup with active state | AppShell test |
| AC-PRESERVE-002 | Desktop navigation remains unchanged | AppShell test and existing review-nav report |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Mobile Review item mounts `NavReviewCount` next to its label and reuses the visible active-route class | AppShell test and browser smoke |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged; no API mutation |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/app-shell/AppShell.test.ts src/components/app-shell/NavReviewCount.test.ts` | targeted regression | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 |
| `npm run verify` | broader regression | yes | exits 0 |
| `git diff --check` | whitespace check | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library` | Set a nonzero disposable review queue, open the mobile menu, inspect Review | Review menu item shows the localized positive count and Library remains the active route |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| Sprint expands into review scheduling/API | Split a new contract |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert `AppShell.tsx` and `AppShell.test.ts` |
| Data | N/A |
