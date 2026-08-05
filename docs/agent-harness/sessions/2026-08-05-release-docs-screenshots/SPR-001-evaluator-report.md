# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | success with accepted packaging limitation |
| summary | Bilingual release docs were refreshed and a real Library → Practice → Shadowing screenshot composite was added to both README files. Current-source DMG publication remains blocked by missing redistributable macOS FFmpeg assets. |
| next_actions | merge verified work to main, push, and remove only confirmed merged stale branches |
| artifacts | `public/demo/readme-core-workflow.png` plus three source screenshots; this session directory |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `SPR-001-contract.md` |
| Safety profile | `legacy-safety-profile.md` |
| Domain | Release documentation / desktop distribution / visual README |
| Date | 2026-08-05 |
| Evaluator | AI Agent |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | protected data unchanged | pass | git status/path review; no `prisma/dev.db`, uploads, videos, or `.env*` changes |
| AC-PRESERVE-002 | code/build remains valid | pass | lint, 571-test suite, production build |
| AC-CHANGE-001 | bilingual docs refreshed | pass | README/support/desktop/architecture/maintenance docs reviewed and updated |
| AC-CHANGE-002 | real screenshot composite embedded | pass | local Browser run produced Library, Practice, and Shadowing captures; composite inspected |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` unchanged or approved | pass | protected path remained ignored and untouched |
| `public/uploads/` unchanged or approved | pass | no changes in status or file timestamps from task work |
| `.env*` not edited | pass | no env files changed |
| `npm run sync` not run or approved | pass | not run |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| `npm run lint` | pass | exit 0 |
| `npm run test:ci` | pass | 569 passed, 2 skipped, 0 failed |
| `npm run build` | pass | exit 0; existing NFT/deprecation warnings only |
| desktop packaging contract test | pass | 6 passed |
| `DEEPLISTENER_TARGET_PLATFORM=darwin DEEPLISTENER_TARGET_ARCH=arm64 npm run desktop:preflight` | accepted deviation | fails closed because `vendor/ffmpeg/darwin-arm64/{ffmpeg,ffprobe}` and `assets.json` are absent |

## Browser Verification

| ID | Route | Result | Evidence |
|---|---|---|---|
| BV-001 | `/library` | pass | `public/demo/readme-core-workflow-library.png` |
| BV-002 | `/practice/[id]` | pass | `public/demo/readme-core-workflow-practice.png` |
| BV-003 | `/practice/[id]` Shadowing | pass | `public/demo/readme-core-workflow-shadowing.png` |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | accepted-deviation | packaging | Current-source macOS DMG cannot be produced on this checkout because required redistributable FFmpeg assets are not present; public preflight correctly fails closed. | Supply licensed target assets and run the macOS packaging workflow on macOS. |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes | Audit confirms the tagged DMG is older than current source; no false “latest DMG” claim remains. |
| FEAT-002 | yes | English and Chinese user/contributor/desktop docs now state Mac-only packaging and Windows source usage. |
| FEAT-003 | yes | Real local app screenshots are composited and embedded near the top of both READMEs. |

## Handoff Notes

- Update this report before claiming completion.
