# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-landing-demo-status |
| Domain | Landing / accessibility |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Accessible landing Demo loading status | `src/app/page.tsx` | Clicking or auto-starting Demo exposes a busy button and one concise polite status until navigation or failure |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Demo API/seed and media | no behavior change needed |
| OOS-002 | Provider setup and import flows | separate contracts |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing Demo readiness redirect and error copy remain intact | page.first-success test and full verify |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Loading state is machine-readable to assistive technology without repeated timer announcements | page test and browser/source evidence |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/page.first-success.test.ts src/app/first-session-accessibility.test.ts` | targeted regression | yes | exits 0 |
| `npm run verify` | broader regression | yes | exits 0 |
| `git diff --check` | whitespace check | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/` | Inspect the Demo CTA source/DOM while it is loading | CTA exposes `aria-busy=true` and a single polite status; no Demo API mutation is required for the check |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for confirmation |
| Scope expands into Demo/API behavior | Split a new contract |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert landing component/test |
| Data | N/A |
