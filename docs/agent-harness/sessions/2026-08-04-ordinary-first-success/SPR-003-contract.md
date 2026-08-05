# DeepListener Sprint Contract — Cross-platform Verification and Failure Injection

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-003 |
| Mode | Adversarial |
| Session | 2026-08-04-ordinary-first-success |
| Domain | Import recovery, provider failure injection, cross-platform test fixtures |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Expected Behavior |
|---|---|---|
| VERIFY-001 | Cross-platform test fixtures | Windows URL/path, CRLF, junction, and disposable-root tests express the same security and behavior contracts without hard-coded POSIX assumptions. |
| VERIFY-002 | `src/lib/import-jobs/run.ts` injection seam | Production defaults remain unchanged while tests can inject a provider factory and bounded timeout. |
| VERIFY-003 | Import failure recovery tests | Fake provider quota/network failure, timeout, late response, stale lock, database activation failure, change-provider retry, and exactly-one activation are proven on disposable roots. |
| VERIFY-004 | `src/lib/import-jobs/prisma-activation.e2e.test.ts` | A disposable Prisma database proves activation and resume produce exactly one Track and preserve sentence creation. |

## Out of Scope / Human Gates

- No Prisma schema or migration changes.
- No access to, deletion of, or overwrite of `prisma/dev.db`, `public/uploads/`, or user videos.
- No real Provider credentials or network calls during automated tests.
- No bundled FFmpeg installation or real video asset replacement.
- No Demo copyright/provenance approval, Desktop signing, clean-install release claim, or target-user study.

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| VERIFY-PRESERVE-001 | Production provider selection remains `getTranscriptionProviderFor` by default. | `run.ts` default parameter and build/typecheck. |
| VERIFY-PRESERVE-002 | Failed imports retain operation-owned staging and do not expose secrets. | `provider-failure-injection.test.ts`, existing manifest/attempt tests. |
| VERIFY-CHANGE-001 | Quota/rate-limit errors receive safe retry/change-provider guidance. | `upload-error.ts`, `upload-error.test.ts`, provider failure test. |
| VERIFY-CHANGE-002 | Timeout, late response, stale lock, and DB failure are recoverable without duplicate Track activation. | `provider-failure-injection.test.ts`, `prisma-activation.e2e.test.ts`. |

## Commands

| Command | Required Result |
|---|---|
| `node --import tsx --test src/lib/import-jobs/provider-failure-injection.test.ts src/lib/import-jobs/prisma-activation.e2e.test.ts` | exits 0 |
| `npm run lint` | exits 0 with zero warnings |
| `npm run build` | exits 0; same-volume TEMP/TMP workaround is allowed for Windows `EXDEV` |
| `npm run test:ci` | exits 0 with only the documented Windows POSIX-permission skip |

## Rollback

Revert only the files listed in this contract and the associated test/report documents. Disposable roots are removed by test cleanup; no protected data rollback is required.
