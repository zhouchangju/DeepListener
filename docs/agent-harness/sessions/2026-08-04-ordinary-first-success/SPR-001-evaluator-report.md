# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | warning |
| summary | Onboarding/readiness changes are implemented and targeted gates pass; release-level evidence is still incomplete. |
| next_actions | Complete real Demo asset approval, cross-platform packaging evidence, accessibility audit, and target-user sessions. |
| artifacts | `src/components/onboarding/OnboardingGuide.test.ts`; `src/components/app-shell/AppShell.test.ts`; `src/lib/setup-readiness.test.ts`; `src/lib/route-readiness.test.ts`; `openspec/changes/ordinary-learner-first-success/implementation-status.md` |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `docs/agent-harness/sessions/2026-08-04-ordinary-first-success/SPR-001-contract.md` |
| Safety profile | `docs/agent-harness/sessions/2026-08-04-ordinary-first-success/legacy-safety-profile.md` |
| Domain | First-session onboarding, readiness, and provider privacy boundary |
| Date | 2026-08-04 |
| Evaluator | AI Agent; human gates remain open |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | Skip/replay remain available and existing onboarding storage semantics are preserved | pass | `OnboardingGuide.test.ts`, `AppShell.test.ts` |
| AC-PRESERVE-002 | Existing URLs and provider privacy boundary remain truthful | pass | setup/readiness tests; provider route tests; no secret values returned |
| AC-CHANGE-001 | Spotlighted targets are reachable and no click-catcher blocks them | pass | `OnboardingGuide.test.ts` spotlight/pointer contract |
| AC-CHANGE-002 | Focus entry/return and Escape are deterministic | pass | `OnboardingGuide.test.ts`, AppShell integration assertions |
| AC-CHANGE-003 | Final actions navigate or execute a real journey contract | pass | `AppShell.test.ts`, Demo journey and Practice structure tests |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` unchanged or approved | pass | `git status --short -- prisma/dev.db` returned no change; no database command was run against the active path |
| `public/uploads/` unchanged or approved | pass | `git status --short -- public/uploads` returned no change; tests used temporary roots |
| `.env*` not edited | pass | `git status --short -- .env .env.local` returned no change; no secret values were read or printed |
| `npm run sync` not run or approved | pass | No sync command was run |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| `node --import tsx --test src/components/onboarding/OnboardingGuide.test.ts src/components/app-shell/AppShell.test.ts src/lib/setup-readiness.test.ts src/lib/route-readiness.test.ts` | pass | All targeted tests passed |
| `npm run lint` | pass | Exit 0, zero warnings |
| `npm run build` | pass with environment workaround | Exit 0 when `TEMP`/`TMP` pointed to a same-volume temporary directory; default Windows run hit cross-volume `EXDEV` in the existing build wrapper |
| `npm run test:ci` | warning | 376 tests: 359 passed, 17 Windows environment/path/symlink/permission failures; no new business assertion failure identified |

## Browser Verification

| ID | Route | Result | Evidence |
|---|---|---|---|
| BV-001 | `/` | pass with manual smoke; formal accessibility audit pending | Guide opened, Escape closed it, narrow viewport rendered; no screenshot artifact retained |
| BV-002 | `/setup` | pass with manual smoke | Provider dialog opened without entering a key; setup remained read-only and no provider request was triggered |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | follow-up | Demo | Current bundled audio is still synthetic; HG-01 is open | Human approval and replacement with real redistributable spoken-English asset |
| EV-002 | follow-up | Release | Clean macOS/Windows packaging and installer evidence are absent | Run T401/T408 and close HG-03 |
| EV-003 | follow-up | Usability/accessibility | 200% zoom, screen reader, reduced-motion, and five target-user sessions are not complete | Run T310/T403/T405 and close HG-04 |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes | Target interaction and keyboard semantics are covered by code and targeted tests |
| FEAT-002 | yes | Onboarding actions have explicit navigation/journey contracts |
| FEAT-003 | yes | Setup/readiness privacy boundary is preserved and tested |

The overall ordinary-learner change is **not release-accepted** until the open findings and human gates are closed. Import/recovery implementation evidence is tracked separately in `openspec/changes/ordinary-learner-first-success/implementation-status.md`.

## Handoff Notes

- Do not replace `public/demo/demo-listening.mp3` without HG-01 approval.
- Keep import tests on disposable roots; do not point them at `prisma/dev.db` or `public/uploads/`.
- The full test failures are Windows compatibility/environment findings, not permission to weaken test or safety gates.
