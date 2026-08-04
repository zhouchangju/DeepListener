# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | success |
| summary | Four scoped external-alpha contracts implemented and verified without touching protected user data. |
| next_actions | Replace the synthetic demo with owned/licensed speech and complete release prerequisites before external-user research. |
| artifacts | `openspec/changes/external-alpha-first-session/`, this session directory |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `SPR-001-contract.md` |
| Safety profile | `legacy-safety-profile.md` |
| Domain | First session / Setup / Shadowing |
| Date | 2026-08-03 |
| Evaluator | Codex |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| FEAT-001 | Demo entry and blind practice handoff | pass | 340-test suite; browser BV-001 |
| FEAT-002 | Provider configured-vs-connected wording | pass | 340-test suite; browser BV-003 |
| FEAT-003 | Capture Vault/Review handoff | pass | 340-test suite; browser BV-002 |
| FEAT-004 | Notation preservation on text edit | pass | targeted Shadowing source test and 340-test suite |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` unchanged or approved | pass | no tracked change; browser used disposable `DEEPLISTENER_DATA_DIR` |
| `public/uploads/` unchanged or approved | pass | no tracked change; no media writes in contract |
| `.env*` not edited | pass | no tracked change and no secret values read |
| `npm run sync` not run or approved | pass | not run |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | accepted-deviation | Release boundary | Synthetic demo audio, signing/notarization, and external-user research remain outside this code sprint. | Keep explicit in handoff and do not claim public-release readiness. |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes | Demo seed and blind-mode route verified in browser and tests. |
| FEAT-002 | yes | Provider card now distinguishes configuration from connectivity and preserves no-probe behavior. |
| FEAT-003 | yes | Capture status notice exposes current Track Vault and Review destinations. |
| FEAT-004 | yes | Text edit sends current notation JSON and no longer submits `formatting: null`. |

## Handoff Notes

The implementation is intentionally additive and does not prove external-user
activation. A meaningful owned/licensed speech demo and clean-profile packaged
interactive test are required before usability conclusions. Full verification:
targeted tests passed (26), and `npm run verify` passed (lint, 340 tests, and
production build). Browser checks BV-001 through BV-003 passed against a
disposable data root.
