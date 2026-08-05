# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract + Adversarial boundary review |
| Session | 2026-08-04-ordinary-first-success |
| Domain | First-session onboarding, readiness, accessibility |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Fix onboarding target interaction and keyboard semantics | `src/components/onboarding/**` | The highlighted target is not blocked by an overlay; Escape, focus entry/return, skip, next and finish are deterministic |
| FEAT-002 | Make onboarding action semantics explicit | `src/components/onboarding/**`, `src/components/app-shell/AppShell.tsx`, tests | A step can describe a navigation/action contract without falsely implying completion when it only closes the guide |
| FEAT-003 | Preserve truthful readiness semantics | `src/app/setup/**`, `src/lib/setup-readiness.ts` | Setup remains read-only, does not probe providers, and separates configured from connected |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Prisma schema, migrations, `prisma/dev.db` | This slice must not mutate protected learning data |
| OOS-002 | Upload/transcription retry, SRT/VTT, Demo audio replacement | Separate Adversarial tasks with distinct contracts and fixtures |
| OOS-003 | Desktop packaging/signing/installer | Requires upstream platform evidence and human release gate |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Skip and replay remain available; completion persists only through the existing onboarding storage key | Onboarding tests + browser smoke |
| AC-PRESERVE-002 | Existing navigation URLs and setup/provider privacy boundaries remain unchanged | Source inspection + targeted tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Remove the blocking click-catcher behavior and make spotlighted targets reachable | Onboarding interaction test + browser pointer check |
| AC-CHANGE-002 | Add focus management, Escape close, and focus return | Keyboard/browser check |
| AC-CHANGE-003 | Make final action distinguish complete/skip and provide a real destination contract | Onboarding/AppShell test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` and provider secret stores | unchanged; values never read or printed |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/onboarding/OnboardingGuide.test.ts src/app/onboarding.test.ts` | targeted regression | yes | exits 0 |
| `npm run test:ci` | broader tests | if touched area warrants | exits 0 |
| `npm run lint` | lint | important changes | exits 0 |
| `npm run build` | production build | release/deploy-sensitive changes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/` | Open fresh browser, allow onboarding, Tab through controls, press Escape, reopen guide, advance steps, activate direct action | Focus is visible, target is not blocked, guide closes predictably, no route is falsely reported complete |
| BV-002 | `/setup` | Open provider configuration without entering a key | Dialog opens, no external request occurs, secret remains write-only |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into another domain | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert only touched onboarding/readiness files; no data rollback needed |
| Data | N/A; protected data is not touched |
| Deploy | N/A; no packaging/deployment files in scope |
