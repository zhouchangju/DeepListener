# DeepListener Sprint Contrac

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-import-error-copy |
| Domain | API / Audio |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Localized import failure presentation | single, batch, subtitle, recovery UI plus copy helpers | Known safe codes show localized advice; unknown failures show generic localized recovery guidance; no raw persisted server message is rendered. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Provider calls, import state machine, media files, database, packaging | Presentation-only change; existing contracts must remain intact. |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Retry, subtitle replacement, recovery deletion, and navigation contracts remain unchanged. | targeted component tests and full test suite |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Map import-job and client-validation codes to both locale dictionaries. | `recovery-copy.test.ts`, `client-upload-validation-copy.test.ts`, i18n audit |
| AC-CHANGE-002 | Avoid raw `error.message` in learner-facing import UI. | component tests and source audit |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/client-upload-validation-copy.test.ts src/lib/import-jobs/recovery-copy.test.ts src/app/library/UploadButton.test.ts src/app/library/BatchUploadButton.test.ts src/app/library/ImportMediaWizard.test.ts src/app/library/ImportRecoveryList.test.ts src/i18n/first-session-language.test.ts` | targeted regression | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 |
| `npm run test:ci` | broad regression | yes | exits 0 with only documented Windows capability skips |
| `npm run build` | type/build verification | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library?import=subtitle` | Open the subtitle wizard in a Chinese first-session locale. | Guidance remains actionable and localized; no provider/network call is triggered merely by opening it. |

## Stop Conditions

Do not mutate protected data, edit secrets, or expand into provider/runtime behavior.

## Rollback

Revert the presentation helpers/UI/locale/test files only.
