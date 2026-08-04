# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-03-external-alpha-first-session |
| Mode | Contract |
| Owner | Codex |
| Date | 2026-08-03 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | present/unknown; inspect only | read metadata only | any delete, overwrite, migration, or sync |
| DATA-SAFE-002 | `public/uploads/` and `public/videos/` | user-data paths; inspect only | no writes | any delete, overwrite, commit, or sync |
| DATA-SAFE-003 | `.env*` and provider secrets | local-only | do not read values or edit | any edit or secret output |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router and existing demo API remain the runtime seam | `src/app`, `src/app/api/demo/route.ts` | no new server or schema required |
| RUN-002 | Demo ownership is represented by `Track.trackType = DEMO` | `src/lib/demo-seed.ts` | seed/remove behavior must remain idempotent and scoped |
| RUN-003 | Provider connectivity is intentionally deferred to media import | `src/lib/setup-readiness.ts`, setup copy | no live probe may be added |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| External alpha first session | landing, practice, setup copy, Shadowing text edit, related tests and OpenSpec/Contract docs | schema, upload job, transcription provider code, desktop signing/assets, user data |

## Preserve / Change / Verify

| ID | Existing behavior / improvement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Demo seed remains idempotent and personal data remains untouched | existing demo-seed tests |
| AC-PRESERVE-002 | Setup remains read-only and never contacts providers | setup readiness tests and source check |
| AC-PRESERVE-003 | Existing Vault/Review routes and schema remain unchanged | targeted practice/API tests |
| AC-CHANGE-001 | Landing Demo action seeds and opens blind practice | landing/practice tests |
| AC-CHANGE-002 | Provider card says configured, not connected | setup source/message test |
| AC-CHANGE-003 | Capture exposes Vault and Review destinations | practice source test |
| AC-CHANGE-004 | Sentence text edit preserves current notation JSON | Shadowing source test |

## Verification

- `node --import tsx --test src/app/onboarding.test.ts src/app/practice/PracticeClient.structure.test.ts src/components/feature/ShadowingConsole.test.ts src/lib/demo-seed.test.ts src/lib/setup-readiness.test.ts`
- `npm run lint`
- `npm run test:ci`
- `npm run build`

## Stop Conditions

Stop before any protected data/configuration change, Prisma migration, provider
request, sync, signing, or release publication.

## Rollback

Code and copy changes are additive and can be reverted by restoring the touched
source/message/spec files. No data rollback is required because this session
does not mutate persistent user data.
