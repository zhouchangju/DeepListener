# DeepListener Sprint Contrac

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-batch-upload-preflight |
| Domain | API / Audio client workflow |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Batch client-side media validation | `BatchUploadButton.tsx`, tests, `messages/*.json` | Every selected file is checked with the shared client validator before upload; the first invalid file gets localized guidance and no multipart request is sent. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Server validation and import-job transitions | Server remains authoritative and is unchanged by this presentation/preflight improvement. |
| OOS-002 | Per-file partial upload or automatic file repair | Would change batch semantics and needs a separate product decision. |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Valid files still use the existing `/api/upload` multipart flow and progress/recovery UI. | Existing batch tests plus full verify |
| AC-PRESERVE-002 | No-Provider audio guidance remains the first blocking condition for otherwise valid audio. | Existing no-Provider test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Reuse `validateClientUpload` for each selected file before setting uploading state or creating `FormData`. | Component structure test |
| AC-CHANGE-002 | Add a bilingual batch validation message with the local filename and localized reason. | i18n parity test and component test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `public/videos/` | unchanged |
| DATA-SAFE-004 | `.env*` | not edited |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library` | Choose a batch containing an unsupported or oversized local file. | A localized filename-specific error appears; no upload progress begins and no request is sent. |

## Stop Conditions

| Condition | Action |
|---|---|
| Need server or DB changes | Stop and split a new contract |
| Need protected data or secrets | Stop and ask for explicit confirmation |
| Need partial-batch semantics | Stop for product decision |

## Rollback

| Area | Rollback |
|---|---|
| Code/docs | Revert the component, tests, messages, and this session |
| Data | N/A |
| Deploy | N/A |
