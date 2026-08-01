# Desktop-first Distribution Implementation Tasks

## 0. Execution Rules

Each task uses this metadata:

- `Req`: PRD/OpenSpec requirement IDs satisfied or advanced.
- `Deps`: tasks that must be accepted first; `none` means it can start immediately within the active contract.
- `Parallel`: wave/lane. Different lanes in the same wave may run concurrently only when ownership does not overlap.
- `Owner`: exclusive files or responsibility surface for that task.
- `Verify`: minimum evidence required before checking the task complete.

Rules:

1. Do not mark a task complete because code exists; record its verification result beside the checkbox or in the sprint evaluator report.
2. A task may normally fit one focused agent turn or half a working day. Split it if implementation reveals multiple ownership surfaces.
3. Prisma schema/migrations, storage representation, Electron bootstrap, and Forge configuration each have one owner at a time.
4. Workers running in parallel are not alone in the codebase: they must preserve others' edits, avoid overlapping files, and integrate against frozen contracts.
5. Each implementation wave ends with an integration task that runs combined checks and updates the OpenSpec artifacts if reality diverges.
6. Any task touching active database/media, migrations, signing secrets, release publication, or sync requires a new Adversarial harness contract and explicit authority.

## 1. Parallel Execution Overview

```text
W0 Feasibility
  A: Next standalone + Prisma ─┐
  B: FFmpeg/provenance ───────┼─> W0 integration decision
  C: Electron security ───────┤
  D: Demo/usability evidence ─┘

W1 Frozen contracts
  A: data/storage contracts ──┐
  B: configuration/secrets ───┼─> contract integration
  C: shell/runtime manifest ──┤
  D: migration/backup ────────┤
  E: test/release skeleton ───┘

W2 Platform-neutral implementation
  A: data root + Prisma ──────┐
  B: media route/storage ─────┤
  C: settings/diagnostics ────┼─> Server compatibility gate
  D: migration/backup ────────┤
  E: standalone packaging ────┘

W3 macOS feasibility integration
  A: Electron lifecycle/security ─┐
  B: runtime assets/media ────────┼─> M1 macOS arm64 package
  C: first run/demo ──────────────┤
  D: desktop E2E/diagnostics ─────┘

W4 signed macOS beta
  A: signing/notarization ────┐
  B: updater/rollback ────────┼─> M2 beta + user sessions
  C: UX/accessibility ────────┤
  D: support/release docs ────┘

W5 Windows x64
  A: platform/runtime assets ─┐
  B: installer/signing ───────┼─> M3 Windows beta
  C: Windows E2E ─────────────┤
  D: cross-platform restore ──┘

W6 public release gate
```

Critical path: `T000 → T010 → T014 → T050 → T060 → T100 → T140 → T180 → T210 → T260 → T300`.

## 2. Wave W0 — Feasibility and Decision Evidence

### Governance and baseline

- [x] **T000 Create the implementation Adversarial contract**
  - Req: NFR-001, NFR-053
  - Deps: none
  - Parallel: W0-G (must finish before executable spikes)
  - Owner: new `docs/agent-harness/sessions/<date>-desktop-feasibility/**`
  - Work: record protected database/media/config metadata, disposable test roots, stop conditions, rollback, and allowed package/build commands.
  - Verify: contract and safety profile accepted; no active data path is authorized for writes.

- [x] **T001 Capture current Server behavior baseline**
  - Req: FR-013, FR-040, FR-076, NFR-050
  - Deps: T000
  - Parallel: W0-E
  - Owner: baseline evidence and new tests only; no behavior changes
  - Work: record `npm run verify`, route inventory, supported import/export fixtures, database/media path behavior, and active data metadata.
  - Verify: baseline report names exact commit, commands, results, and proof limits.

- [x] **T002 Create disposable desktop test roots and fixtures**
  - Req: FR-020, FR-040, FR-041, NFR-001
  - Deps: T000
  - Parallel: W0-E
  - Owner: `tests/fixtures/desktop/**` or approved equivalent; no production media
  - Work: create tiny generated/owned audio, subtitle/video fixture if legally safe, empty/old/corrupt SQLite fixtures, and temporary data-root helper.
  - Verify: provenance recorded; fixtures are deterministic; active data metadata unchanged.

### Lane W0-A — Next standalone and Prisma

- [x] **T010 Enable a disposable Next standalone build spike**
  - Req: FR-001, DAS-001
  - Deps: T000
  - Parallel: W0-A
  - Owner: spike-only build config/scripts; avoid final Forge config
  - Work: produce `.next/standalone`, copy required static/public immutable assets, launch on loopback from a temporary directory.
  - Verify: root, Setup, Library, and one API health request return expected responses outside the repository runtime.

- [x] **T011 Audit standalone package contents**
  - Req: FR-073, DRD-003
  - Deps: T010
  - Parallel: W0-A
  - Owner: package-content audit script/test
  - Work: enumerate server, static assets, Prisma client/engine, migration inputs, and runtime manifests; fail on missing required files.
  - Verify: removing one required fixture asset makes the audit fail.

- [x] **T012 Prove packaged Prisma read/write on disposable SQLite**
  - Req: FR-020, FR-061, DLR-001
  - Deps: T010, T002
  - Parallel: W0-A
  - Owner: Prisma packaging spike and disposable integration test
  - Work: construct absolute SQLite URL before Prisma import, generate schema via approved migration path, create/read/update representative records.
  - Verify: integration runs from packaged output; read-only database produces Action needed; no active DB access.

- [x] **T013 Compare production migration runner options**
  - Req: FR-050, FR-051, FR-052
  - Deps: T012
  - Parallel: W0-A
  - Owner: decision note under the active change or ADR section
  - Work: test bundled Prisma migrate deploy versus a versioned SQLite runner against existing migration SQL; compare offline packaging, idempotence, failure injection, maintenance burden.
  - Verify: one option selected with executable evidence and rollback behavior; `db push` explicitly rejected.

- [x] **T014 Record standalone/Prisma feasibility verdict**
  - Req: proposal feasibility gate
  - Deps: T011, T012, T013
  - Parallel: W0-A
  - Owner: W0 evaluator report/design update
  - Work: state pass/revise/stop and list required design changes.
  - Verify: verdict cites package launch, Prisma write, read-only failure, and migration evidence.

### Lane W0-B — FFmpeg and media assets

- [x] **T020 Inventory required FFmpeg/ffprobe operations and codecs**
  - Req: FR-041, FR-046, FR-047
  - Deps: T000
  - Parallel: W0-B
  - Owner: runtime asset research/manifest proposal
  - Work: map video probe, subtitle extraction, audio extraction, resampling, MP3 export, and concat requirements to binary capabilities.
  - Verify: every current FFmpeg call site maps to a required operation and fixture.

- [x] **T021 Select candidate redistributable binary source**
  - Req: DRD-003, proposal external obligations
  - Deps: T020
  - Parallel: W0-B
  - Owner: legal/provenance note; no binary committed yet
  - Work: document source, versioning, platform/architecture coverage, checksum source, enabled codecs, license, attribution, redistribution obligations.
  - Verify: unresolved license/provenance blocks T022.

- [x] **T022 Prove explicit packaged-path media operations on macOS arm64**
  - Req: FR-041, FR-047, DMR-002
  - Deps: T002, T021
  - Parallel: W0-B
  - Owner: disposable FFmpeg integration spike
  - Work: run probe, extraction, subtitle path, and export using explicit binary paths with PATH fallback disabled.
  - Verify: all selected fixture operations pass; missing/checksum-invalid binary fails safely.

- [x] **T023 Define runtime asset manifest schema**
  - Req: FR-073, DRD-003
  - Deps: T021, T022
  - Parallel: W0-B
  - Owner: manifest schema/test proposal
  - Work: define name, version, platform, architecture, relative path, checksum, source, license, and capabilities.
  - Verify: schema accepts selected macOS asset and rejects wrong platform/checksum/missing metadata.

### Lane W0-C — Electron shell and security

- [x] **T030 Create minimal sandboxed Electron shell spike**
  - Req: FR-002 through FR-006, NFR-010
  - Deps: T000, T010
  - Parallel: W0-C
  - Owner: disposable `desktop-spike/**`; no production integration
  - Work: single-instance lock, loopback service lifecycle, health wait, BrowserWindow with Node disabled/context isolation/sandbox enabled, bounded failure screen.
  - Verify: launch/second-launch/quit/service-timeout checks pass; no orphan service remains.

- [x] **T031 Prototype per-launch local authorization**
  - Req: NFR-013, DAS-003
  - Deps: T030
  - Parallel: W0-C
  - Owner: spike authorization middleware/session integration
  - Work: generate high-entropy launch authorization, inject it without exposing persistent secrets, protect at least one privileged endpoint.
  - Verify: BrowserWindow request succeeds; unauthenticated local request fails; token absent from logs/diagnostics.

- [x] **T032 Prototype navigation, CSP, permission, and IPC restrictions**
  - Req: NFR-011, NFR-012, NFR-014
  - Deps: T030
  - Parallel: W0-C
  - Owner: Electron security spike/tests
  - Work: deny unapproved navigation/windows, validate sender, expose no generic IPC, define media/microphone permission policy, apply CSP/headers.
  - Verify: seeded navigation and invalid IPC attempts are blocked.

- [x] **T033 Record Electron security feasibility verdict**
  - Req: DAS-006
  - Deps: T031, T032
  - Parallel: W0-C
  - Owner: security decision/evidence
  - Work: document residual trust boundary and any required spec revision.
  - Verify: no proposal depends on renderer Node integration or disabled web security.

### Lane W0-D — Demo and usability evidence

- [x] **T040 Define demo learning script and data ownership**
  - Req: FR-022, FR-023, DFS-002, DFS-003
  - Deps: T000
  - Parallel: W0-D
  - Owner: demo product/provenance document
  - Work: select owned/generated/clearly licensed media, transcript/timeline, blind-listen action, capture action, and Vault/Review discovery.
  - Verify: provenance and redistribution are explicit; no provider call required.

- [x] **T041 Define first-session usability protocol**
  - Req: KPI-001 through KPI-004, DFS-006
  - Deps: T040
  - Parallel: W0-D
  - Owner: usability test script and observation form
  - Work: participant profile, clean-machine condition, tasks, intervention rules, timings, failure coding, privacy/consent, success thresholds.
  - Verify: protocol distinguishes build success from user completion.

- [x] **T042 Decide demo isolation/removal model**
  - Req: FR-024, DFS-004
  - Deps: T040
  - Parallel: W0-D
  - Owner: demo data contract only
  - Work: choose seed marker/ownership model and removal invariants without altering personal records.
  - Verify: contract covers mixed demo/personal library and repeat initialization.

### W0 integration

- [x] **T050 Run the feasibility decision gate**
  - Req: all W0 evidence; proposal stop condition
  - Deps: T001, T014, T023, T033, T041, T042
  - Parallel: W0-I (integration owner only)
  - Owner: OpenSpec proposal/design revision and W0 evaluator report
  - Work: red-team Electron assumption, package burden, data risk, FFmpeg obligations, user evidence plan; revise once.
  - Verify: explicit Proceed / Revise / Stop decision. W1 is blocked unless Proceed or a revised design is approved.

## 3. Wave W1 — Freeze Shared Contracts

### Lane W1-A — Data and storage contracts

- [ ] **T060 Specify runtime path resolver API**
  - Req: FR-010, FR-011, FR-013
  - Deps: T050
  - Parallel: W1-A
  - Owner: new `src/lib/runtime-paths*` contract/tests only
  - Work: define explicit root, legacy fallback, directory layout, normalization, and redacted status.
  - Verify: table tests for desktop root, Server explicit root, Server legacy root, invalid/unwritable root.

- [ ] **T061 Specify storage-key representation and compatibility mapping**
  - Req: FR-012, FR-014
  - Deps: T060
  - Parallel: W1-A
  - Owner: storage types/schema decision; exclusive representation ownership
  - Work: decide database/storage representation for audio/video and how legacy URLs map without breaking current records.
  - Verify: round-trip examples across macOS/Windows roots; traversal and absolute paths rejected.

- [ ] **T062 Freeze media range route contract**
  - Req: FR-015, PDR-004
  - Deps: T061
  - Parallel: W1-A
  - Owner: route contract/test definitions
  - Work: GET/HEAD, full/range/invalid/missing behavior, MIME, cache, authorization, symlink policy.
  - Verify: executable contract tests fail against an empty stub.

- [ ] **T063 Freeze operation staging/compensation contract**
  - Req: FR-042, FR-043, FR-047
  - Deps: T060, T061
  - Parallel: W1-A
  - Owner: media operation contract
  - Work: operation ID, staging layout, promotion, cleanup ownership, crash recovery, and partial-output rules.
  - Verify: state-machine cases cover success and interruption at every boundary.

### Lane W1-B — Configuration and secret contracts

- [ ] **T070 Specify versioned non-secret settings schema**
  - Req: FR-030, FR-035, FR-070
  - Deps: T050
  - Parallel: W1-B
  - Owner: settings schema/tests
  - Work: provider, update channel, proxy/base URL policy, demo state, log preferences, schema version, atomic-write behavior.
  - Verify: validation/migration tests for missing, old, corrupt, unknown-field settings.

- [ ] **T071 Specify secret-store interface and state model**
  - Req: FR-031 through FR-034
  - Deps: T050
  - Parallel: W1-B
  - Owner: secret interface/types/tests; no platform implementation
  - Work: store/read-for-operation/delete APIs, configured/missing/invalid/unknown states, redaction invariants.
  - Verify: fake backend contract proves no read-back to renderer/status.

- [ ] **T072 Specify provider connectivity and error taxonomy**
  - Req: FR-025, FR-035, FR-036
  - Deps: T070, T071
  - Parallel: W1-B
  - Owner: provider readiness/error contracts
  - Work: presence vs verified state, explicit probe consent, auth/network/proxy/quota/empty-transcript categories.
  - Verify: provider-neutral test matrix maps representative provider errors without raw leakage.

### Lane W1-C — Shell and runtime contracts

- [ ] **T080 Freeze Electron process lifecycle contract**
  - Req: FR-002 through FR-006
  - Deps: T050
  - Parallel: W1-C
  - Owner: desktop lifecycle interfaces/tests
  - Work: single instance, port selection, authorization, health timeout, crash, retry, graceful/forced shutdown.
  - Verify: fake service process contract covers normal, timeout, early exit, retry, quit.

- [ ] **T081 Freeze preload/IPC allowlist**
  - Req: NFR-010 through NFR-014
  - Deps: T080
  - Parallel: W1-C
  - Owner: preload types/IPC schema only
  - Work: enumerate required native capabilities; reject generic filesystem/shell/IPC exposure; define sender validation.
  - Verify: API surface review and invalid payload tests.

- [ ] **T082 Freeze runtime asset resolver/manifest contract**
  - Req: FR-041, FR-073
  - Deps: T023, T050
  - Parallel: W1-C
  - Owner: runtime asset types/tests
  - Work: platform/arch mapping, checksum verification, capabilities, packaged vs explicit development fallback.
  - Verify: darwin-arm64 pass; wrong arch, missing, checksum mismatch fail.

### Lane W1-D — Migration and backup contracts

- [ ] **T090 Specify migration state machine**
  - Req: FR-020, FR-050 through FR-053
  - Deps: T013, T050
  - Parallel: W1-D
  - Owner: migration state/types/tests; exclusive migration ownership
  - Work: discover, preflight, backup, stage, migrate, verify, activate, recover; incomplete-state restart behavior.
  - Verify: transition table rejects illegal/unsafe activation.

- [ ] **T091 Specify backup manifest and compatibility policy**
  - Req: FR-054 through FR-056
  - Deps: T050
  - Parallel: W1-D
  - Owner: backup schema/types/tests
  - Work: format/app/schema version, DB integrity/checksum, media manifest, required/optional classification, compatibility window.
  - Verify: valid, corrupt, incomplete, too-new, cross-platform fixtures.

- [ ] **T092 Specify restore conflict and rollback contract**
  - Req: FR-055, FR-057
  - Deps: T091
  - Parallel: W1-D
  - Owner: restore state contract
  - Work: validate, disk preflight, active-data backup, replacement policy, activation, recovery, uninstall retention statement.
  - Verify: no state transition overwrites the only good copy.

### Lane W1-E — Verification/release skeleton

- [ ] **T095 Define desktop verification taxonomy**
  - Req: NFR-050, FR-076
  - Deps: T050
  - Parallel: W1-E
  - Owner: test plan and naming conventions
  - Work: unit, contract, integration, packaged smoke, installer smoke, E2E, signing gate, usability evidence.
  - Verify: each PRD requirement maps to at least one planned evidence type.

- [ ] **T096 Draft native CI matrix without publishing**
  - Req: FR-073 through FR-076
  - Deps: T095
  - Parallel: W1-E
  - Owner: CI design or non-publishing scaffold; no signing secrets
  - Work: shared gate, macOS arm64 package, optional early Windows package smoke, artifact-content audit, manual publish boundary.
  - Verify: CI syntax check/dry run; no external release created.

### W1 integration

- [ ] **T100 Audit and freeze shared contracts**
  - Req: all W1 contracts
  - Deps: T062, T063, T072, T081, T082, T090, T092, T096
  - Parallel: W1-I
  - Owner: integration report/OpenSpec revision
  - Work: remove duplicate abstractions, resolve ownership overlap, trace PRD → spec → contract tests, rerun first-principles opposition.
  - Verify: no unresolved representation, migration, secret, or process-boundary decision blocks W2.

## 4. Wave W2 — Platform-neutral Runtime Implementation

### Lane W2-A — Data root and Prisma

- [ ] **T110 Implement runtime path resolver**
  - Req: FR-010, FR-011, FR-013
  - Deps: T100, T060
  - Parallel: W2-A
  - Owner: `src/lib/runtime-paths.ts` and tests
  - Work: resolve explicit root, legacy fallback, directories, containment helpers, redacted diagnostics.
  - Verify: T060 matrix passes; no writes in tests except temporary roots.

- [ ] **T111 Connect Prisma to resolved database path before client creation**
  - Req: FR-010, FR-020
  - Deps: T110
  - Parallel: W2-A
  - Owner: Prisma bootstrap module and tests; coordinate single ownership of `src/lib/prisma.ts`
  - Work: construct absolute file URL, avoid import-order race, preserve Server behavior.
  - Verify: disposable explicit/legacy DB integration and existing tests pass.

- [ ] **T112 Update readiness for read/write/database compatibility**
  - Req: FR-060, FR-061
  - Deps: T110, T111
  - Parallel: W2-A
  - Owner: setup-readiness module/tests
  - Work: distinguish missing/read-only/writeable/incompatible/corrupt without secret/data disclosure.
  - Verify: read-only regression fails before fix and passes after; normal setup checks preserved.

- [ ] **T113 Implement storage-key compatibility resolver**
  - Req: FR-012, FR-014
  - Deps: T111, T061
  - Parallel: W2-A
  - Owner: storage resolver/types/tests
  - Work: resolve new storage keys and legacy URLs through validated roots; no schema migration yet unless separately approved.
  - Verify: legacy/current fixtures, cross-root restore, traversal/symlink tests.

### Lane W2-B — Media storage and streaming

- [ ] **T120 Implement secure media range parser/response helper**
  - Req: FR-015
  - Deps: T100, T062
  - Parallel: W2-B
  - Owner: new range helper/tests
  - Work: full, open-ended, suffix, satisfiable/unsatisfiable range handling with bounded streaming.
  - Verify: contract matrix and malformed-header tests.

- [ ] **T121 Implement authenticated media route**
  - Req: FR-014, FR-015, NFR-003
  - Deps: T113, T120
  - Parallel: W2-B
  - Owner: new media route/tests
  - Work: GET/HEAD, authorization where applicable, containment, MIME, full/range/missing behavior.
  - Verify: route contract; real seek fixture; missing media safe error.

- [ ] **T122 Adapt playback URLs to media service**
  - Req: FR-012, FR-015, FR-040
  - Deps: T121
  - Parallel: W2-B
  - Owner: shared media URL presenter and focused playback callers/tests
  - Work: keep AudioPlayer/video/WaveSurfer semantics; avoid platform branches.
  - Verify: audio/video playback and seeking targeted tests; Server compatibility.

- [ ] **T123 Implement operation staging and atomic promotion helper**
  - Req: FR-042, FR-043, FR-047, NFR-002
  - Deps: T110, T063
  - Parallel: W2-B
  - Owner: media operation helper/tests
  - Work: operation temp roots, owned-artifact registry, promote, compensate, abandoned-stage discovery.
  - Verify: fault injection at create/write/promote/database boundaries.

- [ ] **T124 Refactor import to portable storage/staging**
  - Req: FR-040, FR-041, FR-042, FR-043, FR-044, FR-045, FR-046
  - Deps: T113, T123
  - Parallel: W2-B
  - Owner: upload/import service and route tests; exclusive upload flow ownership
  - Work: separate HTTP source from ingestion service, retain streaming, embedded subtitle preference, cleanup semantics, progress hook points.
  - Verify: existing upload tests plus disposable explicit-root import/failure tests.

- [ ] **T125 Refactor export paths to portable storage/staging**
  - Req: FR-047, NFR-003
  - Deps: T113, T123
  - Parallel: W2-B
  - Owner: export source/output helpers and related route tests
  - Work: resolve source by storage service, stage output, promote on success, preserve incomplete-export failure.
  - Verify: audio/library/vault export tests under explicit root and failure fixtures.

### Lane W2-C — Settings and diagnostics

- [ ] **T130 Implement atomic non-secret settings store**
  - Req: FR-030, FR-070, PDR-006
  - Deps: T100, T070, T110
  - Parallel: W2-C
  - Owner: settings store/schema/tests
  - Work: load/validate/migrate/default/write atomically; never store credentials.
  - Verify: corrupt/old/interrupted-write tests.

- [ ] **T131 Implement secret-store service with fake backend**
  - Req: FR-031 through FR-034
  - Deps: T100, T071
  - Parallel: W2-C
  - Owner: secret service/contract tests; no real OS backend yet
  - Work: configured state, operation-scoped access, delete, redaction; renderer cannot read values.
  - Verify: fake backend contract and source audit for serialization.

- [ ] **T132 Implement provider configuration/status APIs**
  - Req: FR-030, FR-031, FR-032, FR-033, FR-034, FR-035, FR-036
  - Deps: T130, T131, T072
  - Parallel: W2-C
  - Owner: settings/provider APIs and schemas/tests
  - Work: select provider, store/remove credential via service, explicit connectivity action, safe taxonomy.
  - Verify: API contract normal/invalid/network/no-probe cases; no values in responses.

- [ ] **T133 Implement Settings UI**
  - Req: FR-030, FR-031, FR-035, NFR-040, NFR-041
  - Deps: T132
  - Parallel: W2-C
  - Owner: Settings route/components/tests
  - Work: provider selector, masked replace/remove, configured/unverified/verified state, explicit probe consent, keyboard/focus behavior.
  - Verify: component/route tests and browser keyboard check.

- [ ] **T134 Expand Diagnostics and redacted export contract**
  - Req: FR-060, FR-061, FR-062, FR-063, FR-064
  - Deps: T112, T130, T132
  - Parallel: W2-C
  - Owner: diagnostics service/UI/export tests
  - Work: runtime/data/assets/provider/network states, rotated log policy, redacted bundle, previous-startup failure summary.
  - Verify: seeded secret/media/note strings absent from exported bundle.

### Lane W2-D — Migration and backup

- [ ] **T140 Implement selected offline migration runner on disposable roots**
  - Req: FR-020, FR-050 through FR-052
  - Deps: T100, T090, T013, T110
  - Parallel: W2-D
  - Owner: migration runner/state/tests; exclusive migration ownership
  - Work: initialize, version, preflight, invoke migrations, incomplete-state recovery; no active DB.
  - Verify: empty/current/old/failing/interrupted fixtures.

- [ ] **T141 Implement backup manifest generation and validation**
  - Req: FR-054, FR-055
  - Deps: T100, T091, T110, T113
  - Parallel: W2-D
  - Owner: backup manifest/service tests
  - Work: DB integrity/checksum, media entries, format/app/schema version, staging, archive validation.
  - Verify: valid/corrupt/incomplete/too-new fixtures.

- [ ] **T142 Implement pre-migration backup gate**
  - Req: FR-050, FR-052, FR-072
  - Deps: T140, T141
  - Parallel: W2-D
  - Owner: migration-backup orchestration tests
  - Work: block migration on backup/disk/integrity failure; activate only verified result.
  - Verify: fault injection proves previous state remains active.

- [ ] **T143 Implement restore staging/conflict/activation**
  - Req: FR-055, FR-056
  - Deps: T141, T092
  - Parallel: W2-D
  - Owner: restore service/tests; exclusive restore ownership
  - Work: preflight, active-state backup, conflict policy, restore staging, verification, atomic activation, recovery.
  - Verify: replacement success and failures at every state transition.

- [ ] **T144 Implement copy-first legacy import**
  - Req: FR-053
  - Deps: T142, T143, T113
  - Parallel: W2-D
  - Owner: legacy import service/tests
  - Work: discover legacy paths, select source explicitly, copy, manifest/count verify, migrate copy, preserve source.
  - Verify: fixture metadata/checksums unchanged before/after; partial copy never activates.

### Lane W2-E — Standalone packaging foundation

- [ ] **T150 Productionize standalone build script**
  - Req: FR-001, FR-073
  - Deps: T100, T011
  - Parallel: W2-E
  - Owner: `next.config.ts` and desktop build scripts; exclusive build config ownership
  - Work: enable standalone output, assemble static/public immutable assets, migrations, Prisma assets, manifest.
  - Verify: package-content audit and standalone route smoke from temp directory.

- [ ] **T151 Add runtime asset manifest validation to build**
  - Req: FR-041, FR-073
  - Deps: T150, T082
  - Parallel: W2-E
  - Owner: build-time asset validation/tests
  - Work: fail missing/wrong arch/checksum/license metadata; emit redacted runtime manifest.
  - Verify: mutation tests for each failure.

- [ ] **T152 Create non-publishing native package CI jobs**
  - Req: FR-076, NFR-052
  - Deps: T150, T096
  - Parallel: W2-E
  - Owner: `.github/workflows/desktop-package.yml` or approved separate workflow
  - Work: macOS arm64 artifact assembly and early Windows package smoke where feasible; no signing/publish.
  - Verify: workflow contract test keeps existing CI commands intact; artifacts expire and contain no secrets/data.

### W2 integration

- [ ] **T160 Run Server compatibility and portable-runtime gate**
  - Req: M0 exit, FR-013, FR-040, FR-076
  - Deps: T112, T122, T124, T125, T134, T144, T152
  - Parallel: W2-I
  - Owner: integration/evaluator report; minimal integration fixes only
  - Work: targeted tests, full verify, explicit-root integration, legacy-root regression, media seek, backup/restore fixture, protected data metadata.
  - Verify: M0 exit conditions pass; no active data mutation; update specs/tasks for deviations.

## 5. Wave W3 — macOS Apple Silicon Feasibility Integration

### Lane W3-A — Electron lifecycle/security

- [ ] **T170 Add Electron/Forge development scaffold**
  - Req: FR-001, DRD-001
  - Deps: T160
  - Parallel: W3-A
  - Owner: `desktop/**`, Forge config scaffold, desktop package scripts; exclusive Forge ownership
  - Work: main/preload structure, dev command, production resource paths, no publishing.
  - Verify: dev window loads shared app; lint/type checks include desktop source.

- [ ] **T171 Implement single-instance and service lifecycle**
  - Req: FR-002, FR-003, FR-004, FR-005, FR-006
  - Deps: T170, T080, T150
  - Parallel: W3-A
  - Owner: Electron main lifecycle/tests
  - Work: data root, dynamic port/token, start/wait/retry/recovery/quit, bounded logs.
  - Verify: packaged lifecycle integration covers second launch, occupied port, timeout, normal/forced quit.

- [ ] **T172 Implement secure BrowserWindow and IPC bridge**
  - Req: NFR-010 through NFR-014
  - Deps: T170, T081
  - Parallel: W3-A
  - Owner: BrowserWindow/preload/IPC handlers/security tests
  - Work: sandbox/context isolation/Node disabled/CSP/navigation/window/permission policy/sender validation.
  - Verify: seeded security attempts blocked; Electron security warnings treated as failures in test mode.

- [ ] **T173 Integrate loopback authorization end-to-end**
  - Req: NFR-013
  - Deps: T171, T172, T121
  - Parallel: W3-A
  - Owner: Electron session + server authorization middleware/tests
  - Work: inject per-launch authorization without persistent/browser-readable leakage; protect mutations/media as designed.
  - Verify: packaged normal path works; external local request fails; logs/export redacted.

### Lane W3-B — macOS runtime assets and native services

- [ ] **T180 Package darwin-arm64 Prisma runtime**
  - Req: FR-001, FR-020
  - Deps: T160, T170, T151
  - Parallel: W3-B
  - Owner: Forge resource packaging for Prisma; coordinate Forge owner via frozen config slots
  - Work: include engine/client/migration runtime, handle ASAR/unpack rules, verify architecture.
  - Verify: packaged app initializes and writes disposable DB with no repository/node_modules dependency.

- [ ] **T181 Package darwin-arm64 FFmpeg/ffprobe**
  - Req: FR-041, FR-047
  - Deps: T160, T170, T151
  - Parallel: W3-B
  - Owner: Forge extra resources/runtime asset integration
  - Work: include verified binaries/notices, resolve explicit paths, prevent production PATH fallback.
  - Verify: packaged probe/video import/export on machine without PATH FFmpeg.

- [ ] **T182 Implement macOS secret backend**
  - Req: FR-031 through FR-034
  - Deps: T171, T172, T131
  - Parallel: W3-B
  - Owner: macOS secret adapter/tests
  - Work: choose reviewed OS-backed facility, implement store/operation-read/delete, document backend and limitations.
  - Verify: restart persistence, delete, no renderer read-back, diagnostic redaction.

- [ ] **T183 Implement native import/export dialogs**
  - Req: FR-040, FR-047, NFR-043
  - Deps: T172, T124, T125
  - Parallel: W3-B
  - Owner: dialog adapter and focused UI bridge tests
  - Work: allowlisted file filters, cancellation, suggested export names/locations, no arbitrary filesystem API.
  - Verify: cancel/supported/unsupported/Unicode filename cases.

### Lane W3-C — First run and demo

- [ ] **T190 Implement first-run state and two-path UI**
  - Req: FR-021, DFS-001
  - Deps: T160, T130
  - Parallel: W3-C
  - Owner: first-run route/components/tests
  - Work: demo vs personal-media setup, reversible navigation, completion state, existing users bypass.
  - Verify: new/existing/reset profile tests; keyboard navigation.

- [ ] **T191 Add approved demo assets and provenance**
  - Req: FR-022
  - Deps: T040, T050
  - Parallel: W3-C
  - Owner: demo assets/NOTICE/provenance; no UI code overlap
  - Work: add smallest legal media/timeline, attribution, checksum, package inclusion.
  - Verify: provenance audit; no provider call; package-content check.

- [ ] **T192 Implement idempotent isolated demo seeding/removal**
  - Req: FR-024
  - Deps: T190, T191, T042, T140
  - Parallel: W3-C
  - Owner: demo seed/removal service/tests
  - Work: mark ownership, seed transaction, repeat safety, mixed personal/demo removal invariants.
  - Verify: personal fixtures unchanged after demo removal.

- [ ] **T193 Implement guided demo journey**
  - Req: FR-023, NFR-040 through NFR-042
  - Deps: T190, T192
  - Parallel: W3-C
  - Owner: demo guidance UI/tests
  - Work: blind listen, reveal/navigation, capture, Vault/Review discovery, skip/replay, accessible status.
  - Verify: deterministic browser/desktop E2E with keyboard path.

### Lane W3-D — Desktop integration and evidence

- [ ] **T200 Add packaged app health/startup E2E harness**
  - Req: FR-005, FR-060, NFR-020
  - Deps: T171, T180
  - Parallel: W3-D
  - Owner: desktop E2E harness/tests
  - Work: launch disposable profile, inspect health, capture logs/screenshots, simulate service failure.
  - Verify: normal and failure runs produce deterministic artifacts.

- [ ] **T201 Add import → practice → Vault → restart E2E**
  - Req: FR-040 through FR-046, NFR-021
  - Deps: T173, T181, T182, T183, T200
  - Parallel: W3-D
  - Owner: desktop critical-flow E2E
  - Work: configure fake/local provider or subtitle fixture, import, seek, capture, close, reopen, confirm persistence.
  - Verify: packaged darwin-arm64 pass with disposable root.

- [ ] **T202 Add migration/backup/recovery packaged E2E**
  - Req: FR-050 through FR-056, KPI-005
  - Deps: T180, T142, T143, T200
  - Parallel: W3-D
  - Owner: desktop data-safety E2E
  - Work: old fixture migration success, forced failure rollback, backup/restore, restart.
  - Verify: invariant manifest before/after and no source mutation.

- [ ] **T203 Measure launch, memory, and responsiveness targets**
  - Req: NFR-030, NFR-031, NFR-032, NFR-033
  - Deps: T200, T201
  - Parallel: W3-D
  - Owner: benchmark scripts/report
  - Work: define reference Mac, warm launch, idle memory, large import renderer responsiveness, range seek behavior.
  - Verify: repeatable measurements reported as evidence, not unsupported guarantees.

### W3 integration

- [ ] **T210 Evaluate M1 macOS arm64 feasibility**
  - Req: M1 exit, FR-081, DRD-001
  - Deps: T173, T180, T181, T182, T193, T201, T202, T203
  - Parallel: W3-I
  - Owner: M1 evaluator/OpenSpec revision
  - Work: full gate, package-content audit, security review, data safety, performance, residual cost; strongest opposition review.
  - Verify: explicit Proceed to M2 / Revise / Stop. Do not begin signing/updater unless accepted.

## 6. Wave W4 — Signed macOS Beta and User Validation

### Lane W4-A — Signing/notarization/package variants

- [ ] **T220 Decide macOS architecture support for beta**
  - Req: FR-082
  - Deps: T210
  - Parallel: W4-A
  - Owner: release ADR/config decision
  - Work: arm64-only beta vs x64 separate vs universal; evaluate tester demand, binary/runtime assets, CI cost.
  - Verify: support claim and build matrix updated.

- [ ] **T221 Configure macOS signing and notarization in protected CI**
  - Req: FR-074
  - Deps: T220
  - Parallel: W4-A
  - Owner: Forge signing config/CI secret references; one release owner
  - Work: certificate/notary configuration via secrets, entitlements, hardened runtime, no secret output.
  - Verify: signature/notarization checks pass on downloaded artifact; logs redacted.

- [ ] **T222 Build and clean-install signed macOS beta**
  - Req: KPI-001, DRD-004
  - Deps: T221
  - Parallel: W4-A
  - Owner: release evidence
  - Work: install on clean supported macOS profiles, first launch, uninstall data-retention behavior.
  - Verify: install/launch/uninstall matrix and Gatekeeper evidence.

### Lane W4-B — Update and rollback

- [ ] **T230 Select update host/channel/signature strategy**
  - Req: FR-070, FR-071, OD-004
  - Deps: T210
  - Parallel: W4-B
  - Owner: update ADR only
  - Work: beta/stable metadata, hosting, signature/checksum, manual approval, cost, rollback limitations.
  - Verify: threat/failure review; no publishing yet.

- [ ] **T231 Implement update metadata/version compatibility checks**
  - Req: FR-070, FR-071, FR-073
  - Deps: T230
  - Parallel: W4-B
  - Owner: updater service/tests
  - Work: channel/platform/arch/version/schema rules, tamper rejection, explicit user states.
  - Verify: valid/tampered/wrong-channel/incompatible-downgrade fixtures.

- [ ] **T232 Integrate backup-before-update and post-update health**
  - Req: FR-072, NFR-022
  - Deps: T231, T142, T200
  - Parallel: W4-B
  - Owner: updater/data-safety orchestration tests
  - Work: disk/data preflight, verified backup, install, migrate, health, recovery instruction/rollback.
  - Verify: failure injection before download/install/migrate/health preserves usable state.

- [ ] **T233 Run signed beta upgrade E2E**
  - Req: KPI-005
  - Deps: T222, T232
  - Parallel: W4-B
  - Owner: release upgrade evidence
  - Work: previous beta → candidate update with representative data/media and forced-failure case.
  - Verify: invariants 100%; signature and backup artifacts recorded.

### Lane W4-C — Usability/accessibility

- [ ] **T240 Audit first-run/Settings/recovery keyboard and screen semantics**
  - Req: NFR-040 through NFR-043
  - Deps: T210
  - Parallel: W4-C
  - Owner: focused UI/accessibility fixes/tests
  - Work: focus order, accessible names, status text, native dialogs, destructive impact, narrow viewport.
  - Verify: automated checks where available plus manual keyboard path.

- [ ] **T241 Conduct first three target-user sessions**
  - Req: KPI-001 through KPI-004
  - Deps: T222, T233, T240
  - Parallel: W4-C
  - Owner: consented observation notes; no code ownership
  - Work: clean install, demo, seeded provider error recovery, import; record time/intervention.
  - Verify: results summarized without personal/private media data; repeated blockers identified.

- [ ] **T242 Convert repeated usability blockers into scoped fixes**
  - Req: DFS-006
  - Deps: T241
  - Parallel: W4-C
  - Owner: new follow-up contract/tasks; do not expand current task silently
  - Work: prioritize blockers, update PRD/spec if requirement changed, implement in small tasks.
  - Verify: regression evidence and rerun path defined.

- [ ] **T243 Conduct final two beta sessions**
  - Req: KPI-001 through KPI-004
  - Deps: T242
  - Parallel: W4-C
  - Owner: usability evidence
  - Work: repeat protocol on fresh participants/build.
  - Verify: five-session aggregate reports completion/intervention/median time against targets.

### Lane W4-D — macOS support docs

- [ ] **T250 Write Desktop install, privacy, data, and recovery documentation**
  - Req: FR-057, FR-060 through FR-064, DRD-007
  - Deps: T210, T220, T230
  - Parallel: W4-D
  - Owner: desktop user docs/README links
  - Work: supported OS/arch, data path, provider boundary, backup/restore, uninstall, diagnostics, no-public-network claim.
  - Verify: docs match packaged behavior; unsupported claims absent.

- [ ] **T251 Write maintainer packaging/release runbook**
  - Req: NFR-052, NFR-053
  - Deps: T221, T232
  - Parallel: W4-D
  - Owner: maintainer release docs
  - Work: native builds, secret setup names (not values), package audit, signing, notarization, update staging, rollback, support burden.
  - Verify: second operator/agent can dry-run without hidden local assumptions.

### W4 integration

- [ ] **T260 Evaluate M2 signed macOS beta**
  - Req: M2 exit
  - Deps: T222, T233, T243, T250, T251
  - Parallel: W4-I
  - Owner: M2 evaluator and release decision
  - Work: review user evidence, security, data safety, signing/update, maintenance budget, unresolved must-fix findings.
  - Verify: explicit decision to begin Windows beta or revise macOS foundation.

## 7. Wave W5 — Windows x64 Support

### Lane W5-A — Platform/runtime assets

- [ ] **T270 Implement Windows platform adapter**
  - Req: FR-083, FR-084, NFR-051
  - Deps: T260
  - Parallel: W5-A
  - Owner: Windows adapter only
  - Work: AppData root, executable suffix/path handling, native dialogs, external links, process lifecycle differences.
  - Verify: adapter contract; no domain/UI/schema fork.

- [ ] **T271 Package Windows x64 Prisma runtime**
  - Req: FR-001, FR-083
  - Deps: T260, T180
  - Parallel: W5-A
  - Owner: Windows Prisma package resources/tests
  - Work: engine/client/migrations/ASAR rules and runtime manifest.
  - Verify: packaged disposable DB initialize/read/write on clean Windows runner.

- [ ] **T272 Package Windows x64 FFmpeg/ffprobe**
  - Req: FR-041, FR-083
  - Deps: T260, T181, T023
  - Parallel: W5-A
  - Owner: Windows media runtime assets/tests
  - Work: provenance/checksum/capability-equivalent Windows binaries and `.exe` resolution.
  - Verify: probe/video import/export without system FFmpeg.

- [ ] **T273 Implement Windows secret backend**
  - Req: FR-033, FR-083
  - Deps: T260, T182
  - Parallel: W5-A
  - Owner: Windows secret adapter/tests
  - Work: store/operation-read/delete and documented backend limitations.
  - Verify: restart persistence, delete, renderer non-disclosure, redacted diagnostics.

### Lane W5-B — Installer/signing/update

- [ ] **T280 Select Windows installer and signing policy**
  - Req: FR-075, OD-004
  - Deps: T260
  - Parallel: W5-B
  - Owner: release ADR/config decision
  - Work: installer format, per-user/per-machine behavior, data retention, signing certificate budget, SmartScreen implications, update compatibility.
  - Verify: policy matches support budget and no-admin goal if selected.

- [ ] **T281 Configure Windows installer packaging**
  - Req: FR-075
  - Deps: T270, T271, T272, T280
  - Parallel: W5-B
  - Owner: Forge Windows maker config; exclusive Forge config owner
  - Work: icons/metadata/resources/install/uninstall/data retention.
  - Verify: package-content audit and clean install/uninstall.

- [ ] **T282 Configure Windows signing/update verification**
  - Req: FR-071, FR-075
  - Deps: T281, T231
  - Parallel: W5-B
  - Owner: Windows signing/update CI secret references
  - Work: sign installer/artifacts, verify publisher, reuse channel/schema policies.
  - Verify: signed artifact and tampered update rejection; no secret logs.

### Lane W5-C — Windows behavior/E2E

- [ ] **T290 Add Windows path and filesystem contract cases**
  - Req: FR-012, FR-014, FR-056, FR-083
  - Deps: T270
  - Parallel: W5-C
  - Owner: platform filesystem fixtures/tests
  - Work: separators, drive letters, Unicode, spaces, long names, reserved names, case behavior, locked files.
  - Verify: storage/backup/import contracts pass or documented supported limits enforced.

- [ ] **T291 Run Windows launch/import/restart E2E**
  - Req: M3 core path
  - Deps: T271, T272, T273, T281, T290
  - Parallel: W5-C
  - Owner: Windows desktop E2E
  - Work: clean install, first run, demo, provider fake/subtitle import, seek, Vault, restart, export.
  - Verify: same invariants as macOS critical flow.

- [ ] **T292 Run Windows update/migration failure E2E**
  - Req: FR-050 through FR-052, FR-070 through FR-075
  - Deps: T282, T291
  - Parallel: W5-C
  - Owner: Windows update/data E2E
  - Work: upgrade success, backup failure, migration failure, incompatible downgrade.
  - Verify: active state remains usable or restored in every failure.

### Lane W5-D — Cross-platform portability

- [ ] **T295 Restore macOS backup on Windows**
  - Req: FR-056, DLR-007
  - Deps: T260, T143, T291
  - Parallel: W5-D
  - Owner: cross-platform fixture/evidence
  - Work: representative DB/media/notes/review/study data backup on macOS fixture and restore on Windows.
  - Verify: portable identifiers resolve; invariant manifest passes.

- [ ] **T296 Restore Windows backup on macOS**
  - Req: FR-056, DLR-007
  - Deps: T295
  - Parallel: W5-D
  - Owner: cross-platform fixture/evidence
  - Work: reverse direction and capture filename/metadata compatibility limits.
  - Verify: invariant manifest passes or explicit incompatible entries rejected before activation.

### W5 integration

- [ ] **T300 Evaluate M3 Windows x64 beta**
  - Req: M3 exit
  - Deps: T282, T292, T296
  - Parallel: W5-I
  - Owner: M3 evaluator/OpenSpec revision
  - Work: compare Windows diff to platform-neutral contract, maintenance cost, installer/signing, user-visible parity, data portability.
  - Verify: no forked product/domain architecture; must-fix findings closed before support claim.

## 8. Wave W6 — Public Desktop Release

- [ ] **T310 Run complete dual-platform release candidate gate**
  - Req: M4 exit, all functional/NFR requirements
  - Deps: T300
  - Parallel: W6-A
  - Owner: release integration
  - Work: shared verify, macOS/Windows package and installer tests, security, migration/restore, critical E2E, performance evidence, signing/manifests.
  - Verify: evidence bundle tied to tag/commit; no skipped release-critical check without explicit blocker.

- [ ] **T311 Run final security and data-safety review**
  - Req: NFR-001 through NFR-015
  - Deps: T310
  - Parallel: W6-B
  - Owner: read-only review report
  - Work: Electron config/IPC/navigation, local authorization, secret/log redaction, storage traversal, migration/backup/update rollback.
  - Verify: no open blocker/high finding; accepted deviations documented.

- [ ] **T312 Finalize public download/support/privacy documentation**
  - Req: DRD-007, NFR-053
  - Deps: T300, T250
  - Parallel: W6-C
  - Owner: README/site/release templates/docs
  - Work: Desktop default path, Server path, supported OS/arch, media/provider privacy, backup, known limitations, issue/security support.
  - Verify: link check; claims match release evidence; unsupported platforms absent.

- [ ] **T313 Prepare release artifacts without publishing**
  - Req: FR-073 through FR-076
  - Deps: T310, T312
  - Parallel: W6-A
  - Owner: release staging
  - Work: signed installers, checksums, manifest, release notes, SBOM/notices if adopted, rollback installers.
  - Verify: independent artifact verification and clean-install smoke.

- [ ] **T314 Obtain explicit publish approval**
  - Req: external release authority
  - Deps: T311, T313
  - Parallel: W6-G (human gate)
  - Owner: user/maintainer decision
  - Work: present evidence, residual risks, maintenance/support commitment, exact targets.
  - Verify: explicit approval; absence of approval means no release/upload/visibility action.

- [ ] **T315 Publish and monitor staged release**
  - Req: M4
  - Deps: T314
  - Parallel: W6-A
  - Owner: release operator
  - Work: publish beta/stable according to approval, verify downloads/metadata/update, monitor issues, retain rollback artifacts.
  - Verify: post-publish install/update smoke and documented rollback readiness.

- [ ] **T316 Verify implementation against OpenSpec and archive change**
  - Req: OpenSpec lifecycle
  - Deps: T315
  - Parallel: W6-I
  - Owner: OpenSpec artifacts/main specs
  - Work: verify code against all delta specs, record deviations, sync accepted specs to `openspec/specs`, archive the change only after implementation completion.
  - Verify: no unchecked implementation task or unresolved requirement; archive command/result recorded.

## 9. Requirement-to-Task Traceability Summary

| Requirement domain | Primary tasks |
|---|---|
| Installation/service lifecycle (`FR-001`–`FR-006`) | T010–T014, T030–T033, T080–T082, T150–T152, T170–T173, T200, T210 |
| Portable data/media (`FR-010`–`FR-015`) | T060–T063, T110–T125, T160, T270, T290, T295–T296 |
| First run/demo (`FR-020`–`FR-025`) | T002, T040–T042, T090, T140, T190–T193, T200–T203, T241–T243 |
| Provider/secrets (`FR-030`–`FR-036`) | T070–T072, T130–T134, T172, T182, T273 |
| Media processing (`FR-040`–`FR-047`) | T020–T023, T062–T063, T120–T125, T181, T183, T201, T272, T291 |
| Migration/backup/recovery (`FR-050`–`FR-057`) | T013, T090–T092, T140–T144, T202, T232–T233, T292, T295–T296 |
| Diagnostics (`FR-060`–`FR-064`) | T112, T134, T171, T200, T250 |
| Update/release (`FR-070`–`FR-076`) | T095–T096, T150–T152, T220–T233, T250–T251, T280–T282, T300–T315 |
| Platform support (`FR-080`–`FR-085`) | T023, T082, T152, T170–T183, T210, T220–T222, T260–T300 |
| Data/security NFRs | T000, T031–T033, T061–T063, T071, T081, T090–T092, T121–T144, T172–T173, T202, T232, T311 |
| Performance/accessibility/maintainability NFRs | T041, T095–T100, T133, T150–T160, T193, T203, T240–T251, T310–T316 |

## 10. Tasks That Must Not Run in Parallel

- `T061`, any Prisma schema change, and any migration creation: one representation/schema owner.
- `T090`, `T140`, `T142`, `T143`, `T144`: sequential data-state ownership as specified by dependencies.
- `T150`, `T170`, `T180/T181` integration, `T221`, `T281`: Forge/package configuration changes require a coordination owner even if research/tests run in parallel.
- `T124` and any concurrent upload-route refactor: one ingestion owner.
- `T125` and concurrent export-route refactors sharing the same helper: split by non-overlapping files only after the helper contract is frozen.
- `T231/T232` and platform signing updater work: shared metadata/schema owner must integrate serially.
- Release publication tasks `T313`–`T315`: single release operator and explicit human gate.
