# DeepListener Sprint Contract — Recoverable Import Follow-up

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-002 |
| Mode | Adversarial |
| Session | 2026-08-04-ordinary-first-success |
| Domain | Single/batch media import, subtitles, operation recovery |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Expected Behavior |
|---|---|---|
| IMP-001 | `src/lib/import-jobs/**` | Durable manifest, operation-owned staging, safe size/path checks, lock fencing, retry/cancel semantics, and activation idempotency |
| IMP-002 | `src/app/api/import-jobs/**`, `src/app/api/upload/route.ts` | Single and batch imports use the same recoverable operation; legacy response shape remains compatible |
| IMP-003 | Library import/recovery UI | Failed jobs remain discoverable and offer retry, provider/subtitle replacement, setup, or confirmed removal |
| IMP-004 | Provider test route | Only explicit user-triggered selected-provider tests may contact a provider; sample uses OS temp only |

## Out of Scope / Human Gates

- No Prisma schema or migration changes.
- No access to, deletion of, or overwrite of `prisma/dev.db`, `public/uploads/`, or user videos.
- No real Provider credentials or network calls during automated tests.
- No replacement of the synthetic Demo asset; HG-01 remains human-owned.
- No Desktop packaging/signing or target-user release claim.

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| IMP-PRESERVE-001 | Provider failure retains the staged source and does not require re-upload | `src/app/api/upload/recoverable-upload.test.ts` |
| IMP-PRESERVE-002 | Existing Track activation remains at most once per operation | `src/lib/import-jobs/activation.test.ts` and deterministic operation ID |
| IMP-CHANGE-001 | Batch `PUT /api/upload` creates recoverable operations per file | batch route test and response `operationId` |
| IMP-CHANGE-002 | Promotion keeps staging until durable `ACTIVATED` manifest | `src/lib/import-jobs/staging.test.ts` |
| IMP-CHANGE-003 | Active operation cannot be concurrently canceled or have its subtitle replaced | `create.test.ts`, `run.test.ts`, cleanup guard |
| IMP-CHANGE-004 | Malformed subtitle replacement cannot overwrite a valid sidecar | `create.test.ts` replacement test |

## Commands

| Command | Required Result |
|---|---|
| `node --import tsx --test src/lib/import-jobs/*.test.ts src/app/api/upload/recoverable-upload.test.ts` | exits 0 |
| `npm run lint` | exits 0 with zero warnings |
| `npm run build` | exits 0; same-volume TEMP workaround is allowed for Windows `EXDEV` |
| `npm run test:ci` | record actual result; existing Windows compatibility failures remain findings |

## Rollback

Revert only the import-job, upload adapter, Library recovery UI, provider-test, and related test/docs files. No data rollback is required because automated tests use temporary roots and no protected data path was touched.
