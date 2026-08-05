# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-demo-timeline |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | absent in this checkout | inspect status only | any delete, overwrite, migrate, or sync |
| DATA-SAFE-002 | `public/uploads/` | present, containing only the repository placeholder in this checkout | inspect status only | delete, overwrite, or sync |
| DATA-SAFE-003 | `public/videos/` | present, containing only the repository placeholder in this checkout | inspect status only | delete, overwrite, or sync |
| DATA-SAFE-004 | `.env*` | no local env files present | do not read values | edit, print, or create secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Demo replacement is an asset-maintainer workflow, not a learner runtime path | `scripts/replace-demo-audio.mjs`, T121 contract test | The example timeline must remain a fixture and must not be treated as release audio |
| RUN-002 | Release Demo provenance and licensing remain human-gated | OpenSpec HG-01 and desktop preflight contract | Synthetic/current audio cannot pass the public release gate |
| RUN-003 | Timeline input is consumed by the existing replacement script | `src/lib/demo-timeline-contract.test.ts` | Keep schema compatible with `--timeline` and its validator |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Demo asset contract | `scripts/demo-timeline.example.json`, `src/lib/demo-timeline-contract.test.ts` | audio generation/replacement, Provider calls, Prisma, packaging, release approval |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | The current synthetic Demo remains available for internal alpha use and is not silently replaced. | fixture inspection and desktop preflight expected-failure contract |
| AC-PRESERVE-002 | Timeline validation rejects empty, invalid, overlapping, or out-of-order cues. | T121 targeted test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Provide a six-cue English timeline template that a maintainer can pass to the existing replacement script after HG-01 approval. | fixture plus T121 targeted test |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/demo-timeline-contract.test.ts` | T121 contract | yes | 2 tests pass |
| `git diff --check` | workspace patch | yes | no whitespace errors |
| `npm run lint` | repo | already run in this turn's baseline | exits 0 |
| `npm run build` | repo | already run in this turn's baseline | exits 0; existing non-blocking NFT warning may remain |

## Stop Conditions

Stop before adding or replacing any audio, changing Demo provenance, touching protected data, editing `.env*`, or claiming HG-01 is closed.

## Rollback

Remove the example fixture and contract test, leaving the current Demo audio and runtime behavior unchanged. No data rollback is required because this session does not touch persisted data.
