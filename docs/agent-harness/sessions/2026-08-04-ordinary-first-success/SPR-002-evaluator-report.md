# SPR-002 Evaluator Report — Recoverable Import Follow-up

## Observation

| Field | Value |
|---|---|
| status | warning |
| summary | Recoverable single/batch import and subtitle safety paths are implemented and targeted tests pass; real Provider, process-restart, FFmpeg, and release evidence remain open. |
| next_actions | Run disposable real-media/FFmpeg and fake-provider failure-injection E2E; complete platform and accessibility gates. |
| artifacts | `openspec/changes/ordinary-learner-first-success/implementation-status.md`; `src/lib/import-jobs/*.test.ts`; `src/app/api/upload/recoverable-upload.test.ts` |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| IMP-PRESERVE-001 | Provider failure retains staged source | pass | legacy single and batch recovery tests assert source remains readable |
| IMP-PRESERVE-002 | One operation activates at most one Track | pass in injected activation contract | activation test uses deterministic operation ID and duplicate guard; real Prisma E2E still pending |
| IMP-CHANGE-001 | Batch upload uses recoverable operation per file | pass | `PUT /api/upload` route + batch recovery test |
| IMP-CHANGE-002 | Promotion keeps staging until durable activation | pass | `staging.test.ts` asserts source remains until cleanup stage |
| IMP-CHANGE-003 | Active operation is fenced from cancel/subtitle replacement | pass | import create/run tests and cleanup guard |
| IMP-CHANGE-004 | Invalid subtitle replacement preserves valid sidecar | pass | create replacement test |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` unchanged | pass | no status change; no command targeted active DB |
| `public/uploads/` and `public/videos/` unchanged | pass | no status change; tests use temporary runtime roots |
| `.env*` unchanged and secrets not printed | pass | no status change; provider tests use no real key |
| `npm run sync` not run | pass | no sync command issued |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| Targeted import/provider/UI tests | pass | import jobs, upload recovery, provider test, BatchUploadButton, ImportMediaWizard all passed |
| `npm run lint` | pass | exit 0, zero warnings |
| `npm run build` | pass with same-volume TEMP/TMP | exit 0; default cross-volume Windows run produced existing `EXDEV` wrapper failure |
| `npm run test:ci` | warning | 376 total, 359 passed, 17 environment-specific Windows failures |

## Open Findings

| ID | Severity | Finding | Required Action |
|---|---|---|---|
| IMP-EV-001 | follow-up | Attempt IDs and late-result fencing are implemented and unit-tested, but Provider success/timeout/change-provider behavior is not yet covered with fake adapters | Add injectable provider adapter tests |
| IMP-EV-002 | follow-up | Full process kill/restart and real video + sidecar path not verified | Run disposable-root E2E with FFmpeg and restart fixture |
| IMP-EV-003 | follow-up | Full Prisma exactly-one-Track proof is represented by an injected database contract, not a disposable Prisma E2E in this environment | Run on a machine with SQLite CLI or equivalent disposable DB setup |

## Acceptance

SPR-002 is **implementation-complete for the scoped code paths but not release-accepted**. Open findings are verification gaps, not permission to weaken the safety or quality gates.

## Handoff Notes

- Keep operation staging and manifest paths under a disposable data root during further tests.
- Do not use real Provider credentials or replace the Demo audio without the human gates described in the parent implementation-status document.
