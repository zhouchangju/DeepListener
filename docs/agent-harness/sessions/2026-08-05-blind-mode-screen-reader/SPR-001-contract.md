# DeepListener Sprint Contrac

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-blind-mode-screen-reader |
| Domain | Audio |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Blind-mode screen-reader boundary | `SentenceList.tsx` and `SentenceList.test.ts` | Blurred sentence text is hidden from the accessibility tree while the sentence card remains operable. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Demo assets, provider setup, import jobs, persisted data | Not required for this narrow accessibility fix. |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Sentence card keeps `role="button"`, keyboard selection, and labelled actions. | targeted structural test and browser locator count |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Add `aria-hidden` only to the blurred sentence text container. | targeted structural test and browser smoke |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/feature/audio-player/SentenceList.test.ts src/app/first-session-accessibility.test.ts` | targeted regression | yes | exits 0 |
| `npm run verify` | repo quality gate | yes | lint, 495 tests with 0 failures, build exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/` → `/practice/demo-listening-001?demo=1` | Enter Demo and inspect locator/accessibility tree in initial blind mode. | Sentence cards remain locatable; sentence text is not in the accessibility snapshot until revealed; no console errors. |

## Stop Conditions

Do not mutate protected data, edit secrets, or expand into another domain.

## Rollback

Revert the two touched source/test files.
