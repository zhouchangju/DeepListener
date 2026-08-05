# Import Recovery Report (T312)

Date: 2026-08-04
Mode: Adversarial
Data roots: disposable temporary roots only

## Resul

Import recovery invariants pass under injected Provider, timeout, late-result,
database, and batch-upload failures. Failed operations remain discoverable and
retryable; successful activation is idempotent.

## Invariant matrix

| Failure / transition | Expected invariant | Evidence | Result |
|---|---|---|---|
| Provider credential/setup failure | Source remains staged and recovery job is returned | `provider-failure-injection.test.ts`; `recoverable-upload.test.ts` | Pass |
| Quota/network failure | Safe error category; change-Provider retry uses the selected new Provider | `provider-failure-injection.test.ts` | Pass |
| Timeout | Attempt is `TIMED_OUT`; source and operation remain recoverable | `provider-failure-injection.test.ts` | Pass |
| Late Provider response | Old attempt cannot activate or overwrite a newer state | `provider-failure-injection.test.ts`; `transcription-attempt.test.ts` | Pass |
| Track creation failure | Promoted media remains available for resume; no data loss | `provider-failure-injection.test.ts` | Pass |
| Batch partial failure | Each failed item keeps its own operation ID and recovery state | `recoverable-upload.test.ts` | Pass |
| Subtitle activation | Exactly one Track and sentence set is created | `activation.test.ts`; `prisma-activation.e2e.test.ts` | Pass |

## Verification

The focused recovery suite passed: 10 tests, 0 failures. All database tests used
disposable Prisma/SQLite roots; no active database, user upload, or environmen
file was read or written.

## Limitations

Real Provider quota/network behavior and real FFmpeg media decoding remain
release-environment checks. Fake adapters validate state transitions and
invariants but do not prove an external service's availability.
