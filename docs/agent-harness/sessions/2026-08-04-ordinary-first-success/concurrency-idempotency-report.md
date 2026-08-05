# Import Concurrency and Idempotency Report (T315)

Date: 2026-08-04
Mode: Adversarial
Data roots: disposable temporary roots only

## Resul

Duplicate resume requests, live locks, late attempts, and repeated activation
produce at most one Track for an operation. The operation ID is the stable Track
identity and completed attempts are fenced.

## Evidence matrix

| Scenario | Expected invariant | Evidence | Result |
|---|---|---|---|
| Live duplicate processing | Second worker is fenced by the operation lock | `run.test.ts` | Pass |
| Concurrent/duplicate activation | One Track and one sentence set | `activation.test.ts`; `prisma-activation.e2e.test.ts` | Pass |
| Retry after Provider failure | New selected Provider attempt; no duplicate Track | `provider-failure-injection.test.ts` | Pass |
| Late timeout result | Stale attempt cannot activate | `provider-failure-injection.test.ts` | Pass |
| Repeated completed resume | Existing `ACTIVATED` manifest is returned unchanged | `activation.test.ts`; `run.test.ts` | Pass |

## Verification

The focused concurrency/idempotency scenarios passed with 0 failures. Track and
sentence assertions used a fake database or disposable Prisma database; active
user data was not involved.

## Limitations

Stress testing across multiple packaged Desktop processes and a real database
filesystem remains a release-environment check.
