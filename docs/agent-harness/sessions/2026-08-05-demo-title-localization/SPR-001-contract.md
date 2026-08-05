# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-demo-title-localization |
| Domain | Learner-facing Library copy |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Localize bundled Demo card title | Library server projection + both locale files | Chinese Library shows a Chinese Demo title; English remains natural; personal titles pass through unchanged |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Persisted Demo title, Practice behavior, import pipeline | display-only copy fix; avoid data migration and workflow scope expansion |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Demo ownership marker and stored title remain stable | source inspection + test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | `trackType === "DEMO"` receives `library.demoTrackTitle` only for display | targeted test + browser DOM/screenshot |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/library/demo-title.test.ts src/i18n/first-session-language.test.ts` | targeted regression | yes | exits 0 |
| `npm run verify` | full local gate | yes | lint, tests, build pass with only known environment skips |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library?import=subtitle` | open Chinese locale, inspect the existing Demo card behind the subtitle dialog | card title reads `离线 Demo：盲听练习`; dialog remains functional |

## Rollback

Revert the scoped code, translations, test, and evidence files; no database rollback is needed.
