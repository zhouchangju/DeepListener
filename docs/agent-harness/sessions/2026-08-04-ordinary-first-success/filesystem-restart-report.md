# Import Filesystem and Restart Report (T314)

Date: 2026-08-04
Mode: Adversarial
Data roots: disposable temporary roots only

## Resul

Operation-owned staging, atomic manifests, stale-lock recovery, child-process
restart, and activation cleanup are passing in the local test harness.

## Invariant matrix

| Scenario | Expected invariant | Evidence | Result |
|---|---|---|---|
| Manifest write | Relative safe artifact keys and atomic replacement | `manifest.test.ts` | Pass |
| Disk preflight | Reserve is preserved for manifest/derived output | `staging.test.ts` | Pass |
| Activation promotion | Staging remains until durable activation, then is cleaned | `staging.test.ts`; `activation.test.ts` | Pass |
| Stale lock | A killed-process lock can be recovered after the configured bound | `provider-failure-injection.test.ts` | Pass |
| Child process termination | Persisted `TRANSCRIBING` state resumes with a new fenced attempt | `provider-failure-injection.test.ts` | Pass |
| Cancellation | A canceled operation cannot be reactivated by resume | `run.test.ts` | Pass |

## Verification

The focused filesystem/restart suite passed: 8 tests, 0 failures. Tests used
temporary roots and did not touch `prisma/dev.db`, `public/uploads/`,
`public/videos/`, or `.env*`.

## Limitations

Real low-disk devices, OS power loss, and packaged Desktop restart behavior
remain platform/release checks.
