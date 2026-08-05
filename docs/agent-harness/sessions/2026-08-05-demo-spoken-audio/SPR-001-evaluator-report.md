# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | success |
| summary | Spoken-English Demo asset replacement completed and all repository quality gates passed |
| next_actions | None for this sprint; vendor target-specific FFmpeg assets remain a separate release gate |
| artifacts | `public/demo/demo-listening.mp3`, `public/demo/PROVENANCE.md`, `src/lib/demo-seed.ts` |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `docs/agent-harness/sessions/2026-08-05-demo-spoken-audio/SPR-001-contract.md` |
| Safety profile | `docs/agent-harness/sessions/2026-08-05-demo-spoken-audio/legacy-safety-profile.md` |
| Domain | Audio / Release Asset |
| Date | 2026-08-05 |
| Evaluator | AI Agent |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | Stable URL, ID and DEMO ownership | pass | `src/lib/demo-seed.test.ts` |
| AC-PRESERVE-002 | Provider-free/idempotent seed | pass | `src/lib/demo-seed.test.ts` |
| AC-CHANGE-001 | Spoken-English clip replaces busy tone | pass | MP3 duration 18.386s; provenance source is Piper/CC0 dataset |
| AC-CHANGE-002 | Six cues align to clip | pass | replacement script validated timeline against ffprobe duration |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` unchanged or approved | pass | no database commands or status changes |
| `public/uploads/` unchanged or approved | pass | no files under uploads touched |
| `.env*` not edited | pass | no `.env*` in change set |
| `npm run sync` not run or approved | pass | command not run |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| Replacement script with FFmpeg 9 | pass | generated checksum `afcbbf03f432d8954ae70f6a077060f498ced33ef0021a79f890c8e6f35fb1c4` |
| Targeted tests | pass | 9 tests passed in `demo-seed.test.ts` and `desktop-packaging-contract.test.ts` |
| `npm run lint` | pass | ESLint exited 0 with no warnings |
| `npm run test:ci` | pass | 564 passed, 2 documented skips, 0 failed |
| `npm run build` | pass | Next.js production build exited 0; existing NFT/deprecation warnings only |
| `npm run desktop:preflight -- --allow-system-ffmpeg` | pass | Real demo provenance accepted; only the documented system-FFmpeg alpha warning remains |

## Browser Verification

| ID | Route | Result | Evidence |
|---|---|---|---|
| BV-001 | `/practice/demo-listening-001?demo=1` | skipped | No in-app browser tool was available in this session; stable URL and bundled asset were verified by source, build, and targeted seed tests |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | follow-up | Desktop release | Target-specific redistributable FFmpeg assets are still a separate preflight requirement | Do not claim desktop public-release readiness from this sprint |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes | Spoken-English MP3 and six-cue timeline are bundled and verified |
| FEAT-002 | yes | Provenance and checksum regenerated |
| FEAT-003 | yes | `-show_entries` works with installed FFmpeg 9 |

## Handoff Notes

- The previous MP3 SHA-256 was `476153c659e0eb375230badc2c623c5e508e2ab6711c8367c94c08d5e5ded9fd`.
- The rollback backup is under `C:\Users\Administrator\AppData\Local\Temp\deeplistener-demo-backup-a805e07a5b284fa998ee638246aac0dc`.
- The new asset is generated locally; no online TTS endpoint or provider credential is required at runtime.
