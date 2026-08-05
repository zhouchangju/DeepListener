# DeepListener Sprint Contract — Provider and Import Privacy Boundary

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-005 |
| Mode | Adversarial |
| Session | 2026-08-04-ordinary-first-success |
| Domain | Demo/Setup/Provider/import privacy boundaries |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| PRIV-001 | Demo and Setup no-request paths | Demo route; Setup decision guide | Opening or seeding the local Demo does not construct a Provider or call an external endpoint. |
| PRIV-002 | Sidecar import boundary | `src/lib/import-jobs/run.ts` and tests | A valid SRT/VTT sidecar creates local sentence data without constructing or calling a Provider. |
| PRIV-003 | Explicit connectivity probe | `/api/setup/provider/test` | Only the explicitly selected Provider is called; the probe creates no Track or import manifest and removes its temporary sample. |
| PRIV-004 | Diagnostics redaction | Provider/import/media error paths | Raw SDK errors, transcripts, credentials, and private paths do not enter responses or relevant logs. |

## Out of Scope

- Real Provider credentials, quota, or network E2E.
- Replacing the synthetic Demo audio or claiming its redistribution rights.
- Platform packaging, signing, notarization, or manual accessibility/user studies.
- Prisma schema, active database, uploads, videos, or `.env*` changes.

## Preserve / Verify

| ID | Invariant | Evidence |
|---|---|---|
| SAFE-001 | `prisma/dev.db`, media directories, and `.env*` remain unchanged. | Protected-path status check. |
| SAFE-002 | Existing upload/retry/idempotency semantics remain intact. | Import failure-injection and full test suite. |
| SAFE-003 | Public status projections remain path- and secret-free. | Route/manifest redaction tests. |

## Required Commands

| Command | Expected Result |
|---|---|
| `node --import tsx --test src/app/api/setup/provider/test/route.test.ts src/app/setup/page.structure.test.ts src/app/api/demo/route.structure.test.ts src/lib/import-jobs/run.test.ts src/lib/import-jobs/provider-failure-injection.test.ts src/lib/import-jobs/transcription-attempt.test.ts src/app/api/import-jobs/route.test.ts src/lib/desktop-startup-contract.test.ts` | 0 failures |
| `npm run lint` | 0 errors and 0 warnings |
| `npm run build` | exit 0; same-volume TEMP/TMP workaround allowed on Windows |
| `npm run test:ci` | 0 failures; document platform-only skip |

## Stop Conditions

- A protected path or environment file would need to change.
- A real key, user media, or external endpoint would be required.
- A failure would require weakening lint, test, build, or safety rules.

## Rollback

Revert the scoped source and test files in this sprint. No protected-data rollback is required because all runtime tests use fake adapters or disposable roots.
