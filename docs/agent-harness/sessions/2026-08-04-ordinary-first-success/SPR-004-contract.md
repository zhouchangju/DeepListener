# DeepListener Sprint Contract — Learner-facing progressive disclosure

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-004 |
| Mode | Contract |
| Session | 2026-08-04-ordinary-first-success |
| Domain | First-session copy, Setup recovery UI, i18n quality, accessibility semantics |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| UX-001 | Plain first-session copy | `src/app/landing-translations.ts`, `messages/*.json` | Default landing copy does not expose FSRS, SQLite, BYOK, Prisma, or internal status names. |
| UX-002 | Setup progressive disclosure | `/setup`, `src/app/setup/page.tsx` | Readiness cards show learner-facing status first; technical details and concrete repair commands are expandable. |
| UX-003 | Automated language policy | `src/i18n/first-session-language.test.ts`, setup structure test | English/Chinese key parity and first-session terminology boundary are regression-tested. |
| UX-004 | Provider dialog accessibility semantics | `src/app/setup/ProviderConfigDialog.tsx` | Provider selection state and form labels are exposed to assistive technology. |
| UX-005 | Batch import status semantics | `src/app/library/BatchUploadButton.tsx`, `messages/*.json` | Each batch item exposes a localized text status in addition to color/icon state. |
| UX-006 | Short-viewport and actionable recovery affordances | `src/components/onboarding/OnboardingGuide.tsx`, `src/app/setup/page.tsx` | The guide bubble remains reachable in a short/zoomed viewport, and blocked Setup summaries navigate to the real checks instead of a disabled dead end. |
| UX-007 | Demo readiness handoff | `src/app/api/demo/route.ts`, `src/app/page.tsx`, `src/components/app-shell/AppShell.tsx`, `src/lib/api-response.ts` | A known database block returns a bounded safe code and both Demo entry points route the learner to Setup. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Real Demo audio, FFmpeg assets, Provider network calls | Human/release gates remain open and require external assets or credentials. |
| OOS-002 | Prisma schema, active DB, uploads, videos, `.env*` | No data migration or protected-data change is needed. |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Setup readiness IDs, detail keys, provider actions, and route behavior remain unchanged. | Build plus existing setup/readiness tests. |
| AC-PRESERVE-002 | Technical recovery instructions remain available and localized. | Setup structure test and locale parity test. |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Landing and first-session surfaces use learner-oriented terms. | `first-session-language.test.ts`. |
| AC-CHANGE-002 | Setup technical details are hidden until explicitly expanded. | `page.structure.test.ts`; browser check when a UI harness is available. |
| AC-CHANGE-003 | Provider selection and credential fields have stable accessible semantics. | Provider dialog structure test and production build. |
| AC-CHANGE-004 | Batch progress communicates pending/uploading/success/failure without relying on color. | BatchUploadButton test and locale parity test. |
| AC-CHANGE-005 | Short/zoomed onboarding content remains reachable and Setup blocked summaries have a real destination. | OnboardingGuide and Setup structure tests; production build. |
| AC-CHANGE-006 | Known Demo database blocks route to Setup without exposing internal errors. | Demo route/page/AppShell structure tests and API response test. |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` and `public/videos/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/i18n/first-session-language.test.ts src/app/setup/page.structure.test.ts src/app/setup/ProviderConfigDialog.structure.test.ts src/app/library/BatchUploadButton.test.ts src/components/onboarding/OnboardingGuide.test.ts src/app/api/demo/route.structure.test.ts src/app/page.first-success.test.ts src/components/app-shell/AppShell.test.ts src/lib/api-response.test.ts src/i18n/messages.test.ts` | targeted UX/i18n/accessibility/recovery regression | yes | exits 0 |
| `npm run test:ci` | broader regression | yes | exits 0 with documented Windows skip only |
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | production type/build check | yes | exits 0 with same-volume TEMP/TMP workaround if needed |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/setup` | Open a readiness card, inspect initial state, expand “Show technical details”. | Plain status is visible initially; technical detail and repair command appear only after expansion. |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Scope expands to release assets or external credentials | Split a new human-gated contract |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert the scoped source/message/test files listed above; no protected data rollback is required. |
| Data | N/A; no protected data touched. |
| Deploy | N/A. |
