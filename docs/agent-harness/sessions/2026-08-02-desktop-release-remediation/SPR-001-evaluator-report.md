# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | accepted within sprint scope |
| summary | All six acceptance criteria passed; protected data remained unchanged. |
| next_actions | Complete external distribution prerequisites before public release: vendored/licensed FFmpeg, real licensed demo audio, Apple signing/notarization, and clean-profile Electron QA. The internal unsigned alpha path is now repeatable. |
| artifacts | Full gate output, packaged standalone smoke tests, packaged arm64 headless clean-profile smoke, 900x600 browser screenshots/DOM metrics, and protected-data hashes. |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `docs/agent-harness/sessions/2026-08-02-desktop-release-remediation/SPR-001-contract.md` |
| Safety profile | `docs/agent-harness/sessions/2026-08-02-desktop-release-remediation/legacy-safety-profile.md` |
| Domain | Desktop deployment, migrations, Practice UI, PWA compatibility |
| Date | 2026-08-02 |
| Evaluator | AI Agent |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-001 | Quality gates | pass | `npm run verify`: lint pass, 339/339 tests pass, warning-free production build pass; `npx tsc --noEmit` pass |
| AC-002 | Fresh-profile schema and Prisma query | pass | Fresh migration test applied 16 migrations and asserted current ReviewItem columns; packaged smoke returned 200 for Practice and Review |
| AC-003 | Fail-closed negative path | pass | Packaged server with a missing migrations directory exited with code 1 (`failedClosed=true`) |
| AC-004 | 900x600 practice accessibility | pass | BV-001: sentence scroll area height 77px (not zero), capture action visible at y=537, remaining content reachable by scroll |
| AC-005 | Compact Shadowing accessibility | pass | BV-002: panel top=16, bottom=584, height=568, overflow-y=auto, scrollHeight=593 at 900x600 |
| AC-006 | Protected data unchanged | pass | Before/after SHA-256 `39d4be3d693db0a68f2dbd1b84b7d9a2f99066ac0da8711242cb2f11caf715dd`; size and mtime unchanged |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | blocker | Desktop boot | Migration directory resolved outside the bundle and errors were swallowed | resolved: explicit packaged path plus verified process termination |
| EV-002 | blocker | Schema | Current Prisma fields were absent from checked-in migration history | resolved: forward migration plus fresh-database coverage |
| EV-003 | blocker | Practice UI | 900x600 layout collapsed the sentence list to zero height | resolved: height-safe two-column workspace verified in browser |
| EV-004 | must-fix | Electron PWA | Skipping registration did not remove previously registered workers/caches | resolved: unregister targeted workers/caches; external-link denial now surfaces a localized toast |
| EV-005 | must-fix | Shadowing UI | Fixed 500px panel lacked a short-height scrolling boundary | resolved: viewport-bound scroll container verified in browser |
| EV-006 | must-fix | Build | Online Google Fonts and dynamic runtime-media tracing made offline builds fail or trace the project root | resolved: system font stack plus explicit Turbopack runtime-path exclusions; repeated builds completed with zero warnings |
| EV-007 | must-fix | Credentials | Desktop provider settings previously depended on a plaintext local file | resolved: packaged macOS Desktop opts into a Keychain item, with file-backed fallback for Server/dev and cleanup of the legacy file after a successful Keychain write |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001..005 | yes | AC-001 through AC-006 passed with isolated runtime and browser evidence |

## Release Boundary

The repaired code is suitable for continued internal alpha validation. The
unsigned arm64 app was produced successfully at
`.desktop-build/dist/mac-arm64/DeepListener.app`; no Apple Developer identity
was available, so Electron skipped signing. Public distribution is still
blocked by the fail-closed preflight because the package relies on system
FFmpeg and the bundled demo is still synthetic. Apple signing/notarization
and the full interactive clean-profile packaged Electron journey remain
unverified; the packaged headless service/first-run migration smoke has passed.

The user subsequently authorized the non-Apple follow-up work: the macOS
Keychain backend, explicit legacy-DB repair command, and release preflight are
implemented. The protected `prisma/dev.db` was not modified.
