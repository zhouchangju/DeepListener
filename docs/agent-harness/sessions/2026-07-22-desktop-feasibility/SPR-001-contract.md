# DeepListener Sprint Contract — W0 Desktop Feasibility

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | `2026-07-22-desktop-feasibility` |
| Domain | Electron/Next standalone/Prisma/FFmpeg **feasibility** — no production integration |
| Owner | AI Agent (W0 integration owner) |
| Date | 2026-07-22 |
| OpenSpec change | `desktop-first-distribution` (tasks T000–T050) |
| Critical path | `T000 → T010 → T014 → T050` |

## Scope — Exactly the OpenSpec W0 task set

| Task | Lane | In Scope | Exclusive Owner (files) | Forbidden |
|---|---|---|---|---|
| T000 | W0-G | This contract + safety profile | `docs/agent-harness/sessions/2026-07-22-desktop-feasibility/**` | any code/data change |
| T001 | W0-E | Baseline evidence: `npm run verify`, route inventory, path behavior | new `docs/desktop-w0/baseline.md`; no behavior change | editing source |
| T002 | W0-E | Disposable fixtures: tiny generated audio/video, corrupt SQLite, data-root helper | `tests/fixtures/desktop/**` (new, gitignored from active data) | touching real media/db |
| T010 | W0-A | Next standalone build spike; launch on loopback from temp dir | new spike build scripts under `docs/desktop-w0/standalone/**` or a throwaway project; `next.config.ts` edit MUST be reversible and additive (`output: "standalone"`) | final Forge config; production integration |
| T011 | W0-A | Package-content audit script/test | `docs/desktop-w0/standalone/package-audit.*` | — |
| T012 | W0-A | Packaged Prisma read/write on disposable SQLite | `docs/desktop-w0/prisma-spike/**` + disposable integration test | active DB access |
| T013 | W0-A | Migration runner options decision note | `docs/desktop-w0/migration-runner.md` | creating migrations |
| T014 | W0-A | Standalone/Prisma feasibility verdict | this session's evaluator report | — |
| T020 | W0-B | FFmpeg/ffprobe operations + codecs inventory | `docs/desktop-w0/ffmpeg-inventory.md` | committing binaries |
| T021 | W0-B | Redistributable binary source/provenance/license note | `docs/desktop-w0/ffmpeg-provenance.md` | committing binaries before license clearance |
| T022 | W0-B | Explicit packaged-path media ops on darwin-arm64 | `docs/desktop-w0/ffmpeg-spike/**` (disposable) | PATH fallback in the spike assertions |
| T023 | W0-B | Runtime asset manifest schema | `docs/desktop-w0/runtime-asset-manifest.md` + schema test | — |
| T030 | W0-C | Minimal sandboxed Electron shell spike | `desktop-spike/**` (new, untracked, disposable) | production `desktop/**` |
| T031 | W0-C | Per-launch local authorization prototype | `desktop-spike/**` auth middleware | persistent secrets |
| T032 | W0-C | Navigation/CSP/permission/IPC restriction prototype | `desktop-spike/**` security tests | weakening security |
| T033 | W0-C | Electron security feasibility verdict | this session's evaluator report | — |
| T040 | W0-D | Demo script + data ownership doc | `docs/desktop-w0/demo-script.md` | bundling copyrighted media |
| T041 | W0-D | First-session usability protocol | `docs/desktop-w0/usability-protocol.md` | conducting sessions now |
| T042 | W0-D | Demo isolation/removal model contract | `docs/desktop-w0/demo-isolation.md` | altering personal records |
| T050 | W0-I | Feasibility decision gate | this session's evaluator report + OpenSpec proposal/design revision | entering W1 unless Proceed |

## Out Of Scope — Hard Exclusions

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Any change to `prisma/dev.db`, `public/uploads/`, `public/videos/`, `.env*` | protected user data — see safety profile |
| OOS-002 | Any new Prisma migration or `schema.prisma` edit | migrations are frozen W0 inputs |
| OOS-003 | Installing Electron/Forge into the project `package.json` | requires user authority; W0 uses throwaway dirs |
| OOS-004 | Signing, notarization, installers, GitHub Releases, update manifests | external/costly, not authorized |
| OOS-005 | W1–W6 implementation work | blocked by T050 gate |
| OOS-006 | `npm run sync` / `sync:safe` | high-risk remote overwrite |
| OOS-007 | Telemetry | never authorized |
| OOS-008 | AI chat / diagnosis / scoring features | separate decision per PRD §3.2 |
| OOS-009 | Refactor of business code unrelated to W0 | surgical changes only |
| OOS-010 | Rollback/reset/checkout/clean of pre-existing dirty-tree edits | others' work is an asset |

## Acceptance — Per OpenSpec Task Verify Clauses

| ID | Requirement | Evidence |
|---|---|---|
| AC-T000 | Adversarial contract + safety profile accepted; no active data path writable | this file + `legacy-safety-profile.md` |
| AC-T001 | Baseline report names exact commit, commands, results, and proof limits | `docs/desktop-w0/baseline.md` |
| AC-T002 | Fixtures deterministic; provenance recorded; active data metadata unchanged | fixture dir + manifest |
| AC-T010 | Standalone launches outside repo; root/Setup/Library/health respond | launch log + curl outputs |
| AC-T011 | Removing one required asset fails the audit | audit script + mutation evidence |
| AC-T012 | Prisma CRUD from packaged output; read-only DB → Action; no active DB | integration test output |
| AC-T013 | One migration option selected with executable evidence; `db push` rejected | decision note + runner output |
| AC-T014 | Verdict cites launch, Prisma write, read-only failure, migration evidence | evaluator report |
| AC-T020 | Every FFmpeg call site maps to an operation + fixture | inventory table |
| AC-T021 | Source/version/arch/checksum/license/redistribution documented | provenance note |
| AC-T022 | Selected fixture ops pass with PATH disabled; missing/invalid binary fails | spike log |
| AC-T023 | Schema accepts darwin-arm64 asset; rejects wrong platform/checksum/missing | schema test |
| AC-T030 | Launch/second-launch/quit/timeout pass; no orphan service | Electron spike log |
| AC-T031 | BrowserWindow request succeeds; unauthenticated fails; token absent from logs | auth spike log |
| AC-T032 | Seeded navigation + invalid IPC blocked | security test output |
| AC-T033 | No proposal depends on renderer Node integration or disabled web security | evaluator report |
| AC-T040 | Provenance + redistribution explicit; no provider call required | demo doc |
| AC-T041 | Protocol distinguishes build success from user completion | usability protocol |
| AC-T042 | Contract covers mixed demo/personal library + repeat init | demo isolation contract |
| AC-T050 | Explicit Proceed / Revise / Stop with strongest-opposition review | final evaluator report |

## Verification Gates (run in this order, scoped → broad)

1. **Per-task minimum evidence** as listed in each `Verify` clause above.
2. **Scoped**: `node --import tsx --test <touched-test-paths>` for any test added.
3. **Fast loop**: `npm run verify:quick` (lint + test:ci) before integration claims.
4. **Pre-decision**: `npm run verify` (lint + test:ci + build) before T050.
5. **Hygiene**: `git diff --check`; no orphan Node/Electron PIDs; temp dirs cleaned; protected-data baseline re-verified.

**Hard rule:** never weaken lint/test/type/build/CI config to make a failing
command pass. If a spike requires `output: "standalone"` in `next.config.ts`,
the edit must be additive and reversible, and `npm run verify` must remain green.

## Rollback

| Change Type | Rollback Path |
|---|---|
| Disposable temp roots / spike dirs | `rm -rf`; kill spawned PIDs |
| New untracked W0 docs/fixtures | `git clean -fdx <path>` or `rm -rf` |
| Additive `next.config.ts` `output: "standalone"` | revert the single hunk if it destabilizes `npm run verify` |
| OpenSpec proposal/design revision at T050 | revert only T050 hunks; preserve frozen baseline |
| Protected data | **N/A — no write authorized** |

## Authority Boundaries Requiring User Sign-off

The executor MUST stop and ask before:

- installing any dependency into the project `package.json` / `node_modules`;
- downloading third-party binaries into the repo (FFmpeg builds etc.);
- any write to protected data;
- any external publish or network credential use;
- entering W1 (only after T050 Proceed is recorded here).

## Granted Authorities (user-confirmed 2026-07-22)

The following were explicitly approved by the user and are recorded here so
subsequent execution does not re-ask:

| ID | Granted Authority | Scope / Conditions |
|---|---|---|
| AUTH-001 | Add `output: "standalone"` to `next.config.ts` | Additive, reversible single hunk; `npm run verify` MUST remain green; revert if it destabilizes the gate. No other `next.config.ts` change. |
| AUTH-002 | Install Electron/Forge in a **throwaway** directory | Use `desktop-spike/` (untracked) or `mktemp` with its own `package.json`/`node_modules`. MUST NOT touch project `package.json`, `package-lock.json`, or project `node_modules`. Whole dir deleted at end of W0. |
| AUTH-003 | FFmpeg T021 produces research + recommended source + legal memo only | Document source/version/arch/checksum/license/attribution/redistribution; select one candidate. **DO NOT download or commit any binary this round.** T022 may use the system Homebrew ffmpeg only to validate the *invocation contract*, with the spike asserting PATH fallback is disabled in production assertions. |

No other authority is implied. All other OOS items remain in force.
