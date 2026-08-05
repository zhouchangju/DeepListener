# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-release-docs-screenshots |
| Domain | Release documentation / desktop distribution / visual README |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | package-status audit | desktop scripts/config/docs | current Mac packaging status is evidence-backed |
| FEAT-002 | bilingual documentation refresh | README files, SUPPORT, current docs | Mac-only and Windows-from-source guidance are present and current |
| FEAT-003 | real core-flow README visual | README and `public/demo/readme-core-workflow*` | composite image depicts actual app screens near README top |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | application behavior changes | user requested release/docs/readme work |
| OOS-002 | Prisma/data/media migration or sync | protected project data |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | `prisma/dev.db`, uploads, videos, and secrets unchanged | git status and path checks |
| AC-PRESERVE-002 | current code/build remains valid | lint, targeted docs/package tests, build |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | update stale/missing English and Chinese user docs | file review |
| AC-CHANGE-002 | add real screenshot composite and README embed | browser screenshots and image inspection |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `npm run lint` | lint | yes | exits 0 |
| `npm run test:ci` | broader tests | yes | exits 0 |
| `npm run build` | production build | yes | exits 0 |
| `node --import tsx --test src/lib/desktop-packaging-contract.test.ts` | packaging regression | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library` | open library and inspect demo/media entry | core media workflow visible |
| BV-002 | `/practice/[id]` | open a demo track and inspect waveform/sentence UI | sentence-level practice visible |
| BV-003 | `/review` or `/vault` | inspect review/learning workflow | spaced-review or saved-sentence UI visible |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | stop and report |
| `npm run sync` needed | stop and report |
| `.env*` edit needed | stop and report |
| branch target unclear | stop before deletion/push |

## Rollback

| Area | Rollback |
|---|---|
| Code/docs/assets | revert the release commit |
| Data | N/A; protected data must remain unchanged |
| Deploy | N/A; only push after verification |
