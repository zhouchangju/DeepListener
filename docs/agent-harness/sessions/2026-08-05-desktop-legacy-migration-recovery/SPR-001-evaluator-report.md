# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | accepted |
| summary | Known legacy Desktop databases are baselined only after an exact schema fingerprint match, then receive the single pending migration. Unknown untracked schemas fail closed. |
| next_actions | Obtain explicit approval before replacing the installed app or allowing it to upgrade the real Desktop database. |
| artifacts | `legacy-safety-profile.md`, `SPR-001-contract.md`, targeted tests, packaged disposable-profile smoke evidence |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `docs/agent-harness/sessions/2026-08-05-desktop-legacy-migration-recovery/SPR-001-contract.md` |
| Safety profile | `docs/agent-harness/sessions/2026-08-05-desktop-legacy-migration-recovery/legacy-safety-profile.md` |
| Domain | Desktop database startup and recovery |
| Date | 2026-08-05 |
| Evaluator | AI Agent |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | Existing migration safety semantics remain intact | pass | targeted suite: 28/28; full suite: 575/575 |
| AC-PRESERVE-002 | Protected resources remain unchanged | pass | repository DB and real Desktop DB hashes, sizes, and mtimes match baseline; media counts match baseline |
| AC-CHANGE-001 | Known legacy profile upgrades | pass | unit regression plus packaged legacy smoke: `applied=1`, `alreadyApplied=15`, integrity `ok` |
| AC-CHANGE-002 | Unknown untracked schema fails closed | pass | negative tests verify no tracking table or schema mutation |
| AC-CHANGE-003 | Startup log exposes safe error detail | pass | contract test verifies shared diagnostic redaction and fail-closed exit |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` unchanged | pass | SHA-256 `171657900df49dd5a20f37f029923b33cce830467b831edf97e1e015deccaaff`; size `47345664`; mtime `1785741736` |
| Desktop data-root database unchanged during implementation | pass | SHA-256 `8db99a36dcadfb91d2c3f7d394ccd14748de54f3aee718a4f1d7422df5ea75f7`; size `143360`; mtime `1785923154` |
| media and `.env*` unchanged | pass | `public/uploads`: 232 files; `public/videos`: 2 files; Git status contains only scoped source/test/harness changes |
| `npm run sync` not run | pass | command record contains no sync invocation |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| targeted migration/startup tests | pass | `node --import tsx --test src/lib/migration-runner.test.ts src/lib/desktop-startup-contract.test.ts src/lib/diagnostics.test.ts`: 28/28; `git diff --check` clean |
| `npm run verify` | pass | lint passed; 575/575 tests passed; production build passed |
| package and disposable profile smokes | pass with known alpha limitations | `npm run desktop:dist -- --dir --alpha` passed; unpacked app started against clean and legacy disposable profiles. System FFmpeg and unsigned/not-notarized packaging remain separate alpha limitations. |

## Runtime Verification

| ID | Profile | Result | Evidence |
|---|---|---|---|
| RV-001 | Clean disposable profile | pass | `applied=16`, `alreadyApplied=0`, SQLite integrity `ok`, tracker count 16, four FSRS columns present |
| RV-002 | Known legacy disposable profile | pass | `applied=1`, `alreadyApplied=15`, SQLite integrity `ok`, tracker count 16, four FSRS columns present; source backup hash unchanged |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | advisory | distribution | Internal alpha package uses system FFmpeg and has no valid macOS signing identity | Vendor a verified FFmpeg pair and sign/notarize before public distribution |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes | Exact known-legacy migration recovery passed unit, full-gate, and packaged-runtime verification |
| FEAT-002 | yes | Unknown-schema fail-closed and redacted startup diagnostics passed regression verification |

## Handoff Notes

- The installed `/Applications/DeepListener.app` and real Desktop database were not changed.
- The verified unpacked artifact is `.desktop-build/dist/mac-arm64/DeepListener.app`.
- Obtain explicit approval before installing the artifact and allowing the first real-data migration.
