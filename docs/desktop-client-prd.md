# DeepListener Desktop Product Requirements Document

**Version:** 1.0  
**Status:** Proposed target state; not yet implemented  
**Date:** 2026-07-22  
**Decision:** Electron desktop-first; macOS Apple Silicon feasibility first; signed macOS beta next; Windows x64 follows; existing Next.js Server edition remains supported  
**OpenSpec change:** [`desktop-first-distribution`](../openspec/changes/desktop-first-distribution/proposal.md)

## 1. Executive Summary

DeepListener has a complete sentence-level learning loop but currently reaches learners through a developer-oriented setup path. The desktop initiative changes distribution, configuration, storage, upgrade, and recovery so a learner can install and use the product without Node.js, npm, FFmpeg, Prisma commands, a terminal, or manual `.env` editing.

This PRD does not replace the existing learning experience. It packages and hardens it:

```text
Install → First-run readiness → Demo or provider setup → Import media
→ Sentence practice → Vault/Shadowing/Review → Restart/upgrade without data loss
```

The Server edition remains the contributor and advanced self-hosting path. Desktop and Server share product behavior, domain logic, data model, and tests.

## 2. Facts, Assumptions, and Decisions

### 2.1 Facts

- The current application is Next.js App Router with server-rendered pages and route handlers.
- Prisma + SQLite stores learning state; FFmpeg/ffprobe supports video import and audio export.
- OpenAI, Deepgram, and Google are bring-your-own-key transcription providers.
- User database and media are valuable local data and must not be lost or silently overwritten.
- The application has no multi-user authentication and must not be exposed directly to the public internet.
- The current repository already has lint, targeted tests, a full verification gate, and documented maintenance boundaries.

### 2.2 Assumptions to validate

- Electron can host the Next.js standalone service with less risk than rewriting the backend for Tauri.
- Packaged Prisma and FFmpeg assets work reliably on each target architecture.
- A local desktop app materially improves adoption among target learners.
- A legally cleared demo can communicate the product's value without sending media to a provider.
- macOS-first implementation can remain platform-neutral enough that Windows is incremental rather than a second implementation.

### 2.3 Decisions

- Use Electron for the desktop shell and Electron Forge for packaging.
- Keep the existing Next.js application as the shared renderer/local service.
- Validate macOS Apple Silicon first because it is the maintainer's active environment.
- Treat signed macOS beta and Windows x64 as separate release milestones using the same contracts.
- Store runtime data under an OS-provided application data directory, never inside the installed application bundle.
- Keep provider secrets out of browser-visible state and plain-text project configuration.
- Do not add new AI learning features until install-to-first-practice usability is validated.

## 3. Product Goal and Non-goals

### 3.1 Goal

Enable a non-technical English learner to install DeepListener, experience the sentence-level training loop, configure an optional provider, import owned media, and preserve learning data across restarts and upgrades without using a terminal.

### 3.2 Non-goals

- Hosted SaaS or remote multi-user deployment.
- Mobile or Linux clients in the initial initiative.
- Cloud synchronization or account systems.
- App Store / Microsoft Store publication in the first release.
- Generic AI chat, AI diagnosis, or pronunciation scoring.
- Replacing Next.js, Prisma, SQLite, WaveSurfer, or the existing learning workflow.
- Automatically importing copyrighted demonstration media.

## 4. Target Users

### Persona P1: Independent advanced learner

- Uses English podcasts, lectures, interviews, or videos.
- Wants precise listening, dictation, shadowing, and review rather than beginner courses.
- Can obtain an API key but does not want to install a development stack.
- Values local ownership of media and learning history.

### Persona P2: Technical self-hoster

- Prefers source deployment, Docker, custom proxy/provider settings, or remote protected access.
- Uses the Server edition and contributes issues or code.
- Must retain compatibility while Desktop evolves.

### Persona P3: Maintainer/contributor

- Needs reproducible builds, clear specifications, protected data boundaries, and small parallel tasks.
- Must be able to diagnose desktop startup, media, database, provider, and release failures without user secrets.

## 5. Jobs to Be Done

| ID | Job |
|---|---|
| JTBD-001 | When I discover DeepListener, I want to understand its learning method before configuring anything. |
| JTBD-002 | When I install it, I want the app to supply its own runtime dependencies. |
| JTBD-003 | When I first launch it, I want to experience a complete practice loop without already owning an API key. |
| JTBD-004 | When I add a provider key, I want to know which provider is selected and whether the configuration is usable. |
| JTBD-005 | When I import media, I want processing progress and actionable failures rather than developer errors. |
| JTBD-006 | When I restart or upgrade, I want all media, notes, review state, and history to remain intact. |
| JTBD-007 | When something breaks, I want a safe diagnostic report that does not expose credentials or private media. |
| JTBD-008 | When I change computers or platforms, I want to back up and restore my learning library. |

## 6. Release Milestones

### M0: Portability foundation

Purpose: make the existing application capable of running outside a writable repository.

Exit conditions:

- Explicit writable data root controls database, media, exports, backups, logs, and settings.
- Media outside `public/` supports playback and byte-range seeking.
- Legacy paths remain readable and no active data is moved destructively.
- Health/readiness checks distinguish configuration, data, media tools, and service status.

### M1: macOS Apple Silicon feasibility build

Purpose: prove the assumed Electron/Next/Prisma/FFmpeg architecture on one controlled platform.

Exit conditions:

- Unsigned local package launches without system Node.js or FFmpeg.
- Disposable SQLite data is created under the application data directory.
- Owned/synthetic media imports, transcribes or uses bundled transcript data, plays, seeks, and exports.
- Closing and reopening preserves state.
- Failure of any fundamental runtime asset triggers architecture review, not workaround accumulation.

### M2: signed macOS beta

Purpose: validate learner usability and release/upgrade safety.

Exit conditions:

- Signed and notarized installer for supported macOS architectures.
- First-run UI, provider settings, legal demo, backup/restore, update, and diagnostic export are available.
- Five target users complete installation and a first practice session without terminal assistance.
- Upgrade and migration failure paths are tested with automatic rollback evidence.

### M3: Windows x64 beta

Purpose: confirm the architecture is genuinely cross-platform.

Exit conditions:

- Windows installer uses the same product/domain/storage contracts.
- Platform-specific FFmpeg and Prisma assets pass import/export tests.
- AppData paths, long filenames, Unicode, drive boundaries, and Windows file locks are tested.
- Windows signing/update behavior is documented and exercised.

### M4: public desktop release

Purpose: promote Desktop as the default learner distribution.

Exit conditions:

- Both supported platforms meet the same critical acceptance suite.
- Release notes, support scope, privacy boundary, migration, backup, and recovery docs are complete.
- Known limitations are visible before download.
- The Server edition continues to build and pass its verification gate.

## 7. Functional Requirements

### 7.1 Installation and launch

| ID | Requirement | Acceptance |
|---|---|---|
| FR-001 | Desktop SHALL install without requiring Node.js, npm, Prisma CLI, FFmpeg, or ffprobe on the user's PATH. | Clean-machine install completes and the app reports bundled runtime assets ready. |
| FR-002 | Desktop SHALL use one application instance per user profile. | A second launch focuses the existing window and does not start a competing local service. |
| FR-003 | Desktop SHALL bind its local service only to loopback. | Runtime inspection shows no listener on external interfaces. |
| FR-004 | Desktop SHALL select a free local port at launch. | Occupied default ports do not prevent startup. |
| FR-005 | Desktop SHALL show a bounded recovery screen if the local service fails to become healthy. | Failure includes retry, open diagnostics, and quit; it never leaves a blank window. |
| FR-006 | Desktop SHALL shut down its local service when the application exits. | Normal quit leaves no orphan service process. |

### 7.2 Writable data root

| ID | Requirement | Acceptance |
|---|---|---|
| FR-010 | Runtime state SHALL live under a single explicit writable data root. | Database, media, exports, backups, logs, and settings resolve beneath that root. |
| FR-011 | Installed application resources SHALL be treated as read-only. | No successful path writes into `.app`, Program Files, ASAR, or packaged resources. |
| FR-012 | Stored media references SHALL be portable identifiers, not absolute machine paths. | Restoring a backup to a different valid data root preserves playback. |
| FR-013 | The Server edition SHALL support an explicit data-root configuration while retaining a documented legacy default. | Server tests cover explicit and legacy resolution. |
| FR-014 | Media serving SHALL reject path traversal and identifiers outside configured roots. | Security tests cover encoded traversal, symlinks, invalid IDs, and missing files. |
| FR-015 | Audio and video serving SHALL support valid HTTP byte-range requests. | Browser/video/waveform seeking works and range contract tests pass. |

### 7.3 First run and demo

| ID | Requirement | Acceptance |
|---|---|---|
| FR-020 | First launch SHALL initialize an empty compatible database automatically. | No terminal command is required and initialization is idempotent. |
| FR-021 | First launch SHALL present a short choice between demo practice and provider/media setup. | Both paths are visible and reversible. |
| FR-022 | The demo SHALL use owned, generated, or clearly licensed media and bundled timeline data. | Provenance is recorded and no provider request is made. |
| FR-023 | The demo SHALL exercise blind listening, sentence navigation, one learning action, and review/vault discovery. | A scripted/manual first-session journey completes from a clean profile. |
| FR-024 | Demo data SHALL be distinguishable from personal library data and removable without affecting personal data. | Removing demo content leaves user-created tracks and reviews unchanged. |
| FR-025 | The app SHALL not claim provider readiness merely because a key string exists. | Presence and connectivity/credential status use distinct labels. |

### 7.4 Provider configuration and secrets

| ID | Requirement | Acceptance |
|---|---|---|
| FR-030 | Users SHALL select OpenAI, Deepgram, or Google from a Settings UI. | Selection persists across restart. |
| FR-031 | Users SHALL enter, replace, and remove provider credentials without editing `.env`. | Settings actions work from a packaged application. |
| FR-032 | Credential values SHALL not be returned by setup/status APIs or rendered after storage. | Tests assert values never appear in serialized readiness state, logs, or DOM. |
| FR-033 | Credentials SHALL be stored using an OS-backed secret facility or an explicitly reviewed encrypted fallback. | Platform verification documents the actual backend and limitations. |
| FR-034 | Only the selected provider credential SHALL be supplied to a transcription operation. | Provider contract tests inspect injected environment/config by name, not value. |
| FR-035 | Connectivity testing SHALL be explicit and warn if it may send a request or incur cost. | No external request occurs merely by opening Settings or Setup. |
| FR-036 | Invalid credential, unreachable provider, proxy, quota, and empty transcript errors SHALL produce distinct recovery guidance. | Failure-path tests map provider errors to safe public messages. |

### 7.5 Media import and processing

| ID | Requirement | Acceptance |
|---|---|---|
| FR-040 | Existing supported audio, MP4, and WebM import behavior SHALL remain available. | Shared contract tests pass in Server and Desktop runtime modes. |
| FR-041 | Desktop SHALL use its packaged FFmpeg/ffprobe paths rather than PATH discovery. | Import/export succeeds on a machine without FFmpeg installed. |
| FR-042 | Import SHALL write to a temporary file and atomically promote completed output. | Interrupted import does not leave a valid-looking partial media record. |
| FR-043 | Failed processing SHALL remove only artifacts created by that operation. | Existing media and database records remain unchanged in failure tests. |
| FR-044 | Import SHALL expose stage-aware progress: copying, probing, extracting, transcribing, indexing, complete. | UI and job state show a bounded current stage. |
| FR-045 | Large media handling SHALL avoid loading the complete upload into renderer memory. | A representative large-file test confirms bounded memory behavior. |
| FR-046 | Desktop SHALL continue to prefer valid embedded subtitles before provider transcription. | Video fixture tests cover embedded-subtitle and no-subtitle paths. |
| FR-047 | Export SHALL use the packaged media tools and a user-selectable destination. | Export succeeds without writing into installation resources. |

### 7.6 Lifecycle, migration, backup, and restore

| ID | Requirement | Acceptance |
|---|---|---|
| FR-050 | Every schema migration SHALL create a verified pre-migration backup before the first write. | Migration refuses to start when backup creation or verification fails. |
| FR-051 | Migration SHALL be idempotent and record the resulting application/schema version. | Re-running startup does not reapply completed migrations. |
| FR-052 | A failed migration SHALL leave the previous database and media usable through a documented recovery path. | Fault-injection test restores the pre-migration state. |
| FR-053 | Legacy Server data import SHALL be copy-first and SHALL never delete legacy sources automatically. | Import reports source/destination, verifies counts/files, and preserves source metadata. |
| FR-054 | Users SHALL create a complete backup from the UI. | Backup contains database, required media, manifest, versions, and integrity metadata. |
| FR-055 | Users SHALL restore only after validation and conflict confirmation. | Corrupt, incomplete, newer-incompatible, and wrong-format backups are rejected safely. |
| FR-056 | Supported backups SHALL be portable between macOS and Windows. | Cross-platform fixture restores without absolute-path repair. |
| FR-057 | Uninstall SHALL not silently delete user data. | Platform uninstall behavior and manual removal instructions are documented. |

### 7.7 Diagnostics and support

| ID | Requirement | Acceptance |
|---|---|---|
| FR-060 | Setup/Diagnostics SHALL report app version, runtime asset availability, data-root accessibility, database compatibility, provider configuration state, and network boundary. | Each check has Ready/Limited/Action state and a recovery step. |
| FR-061 | Diagnostics SHALL distinguish database readable from database writable. | A read-only database is never reported Ready. |
| FR-062 | Users SHALL export a redacted diagnostic bundle. | Bundle excludes credential values, media contents, transcripts, notes, and raw database records by default. |
| FR-063 | Logs SHALL be bounded and rotated. | Log retention/size limits are tested or inspected. |
| FR-064 | Crash/startup failure information SHALL remain available after restart. | Recovery screen can open the previous diagnostic summary. |

### 7.8 Updates and release

| ID | Requirement | Acceptance |
|---|---|---|
| FR-070 | Desktop SHALL distinguish stable and beta update channels. | Channel selection cannot install an older incompatible schema without warning. |
| FR-071 | Production updates SHALL verify publisher/signature metadata before installation. | Tampered update fixture is rejected. |
| FR-072 | Update SHALL not proceed when a required data backup cannot be created. | Failure leaves current app and data usable. |
| FR-073 | Release artifacts SHALL include version, commit, platform, architecture, and checksums. | Release manifest is generated and validated in CI. |
| FR-074 | macOS production artifacts SHALL be signed and notarized. | Gate verifies signature/notarization before publish. |
| FR-075 | Windows production artifacts SHALL use a documented installer/signing strategy. | Clean Windows install and update tests pass. |
| FR-076 | Desktop release failure SHALL not block Server edition builds. | CI separates shared verification from platform packaging jobs. |

### 7.9 Platform support

| ID | Requirement | Acceptance |
|---|---|---|
| FR-080 | Business/domain code SHALL not branch on operating system. | Platform checks are restricted to designated adapter/bootstrap modules. |
| FR-081 | macOS Apple Silicon SHALL be the first feasibility target. | M1 artifacts and evidence identify `darwin-arm64`. |
| FR-082 | Signed macOS beta SHALL declare whether Intel is supported through separate or universal artifacts. | Decision is recorded before M2 release. |
| FR-083 | Windows x64 SHALL be the second supported desktop platform. | M3 acceptance suite passes on a clean Windows runner/machine. |
| FR-084 | Windows enablement SHALL not require a forked database schema, API, or learning UI. | Diff/review shows only adapter, binary, installer, and platform-test additions where possible. |
| FR-085 | Linux SHALL remain unsupported until a separate proposal defines value and maintenance budget. | No implied support claim appears in release docs. |

## 8. Non-functional Requirements

### 8.1 Data safety

| ID | Requirement |
|---|---|
| NFR-001 | No migration, update, restore, or import may overwrite the only known-good copy of user data. |
| NFR-002 | Operations affecting database and media must have explicit transaction/compensation boundaries. |
| NFR-003 | Missing media must be reported; export must not silently produce incomplete output. |

### 8.2 Security and privacy

| ID | Requirement |
|---|---|
| NFR-010 | Renderer uses `nodeIntegration: false`, `contextIsolation: true`, and sandboxing. |
| NFR-011 | Navigation and new-window creation are denied except for allowlisted external links opened by the OS. |
| NFR-012 | All privileged IPC validates sender, input schema, and requested operation. |
| NFR-013 | The loopback service requires a per-launch authorization mechanism for privileged requests. |
| NFR-014 | Content Security Policy and HTTP security headers apply to desktop-rendered content. |
| NFR-015 | No telemetry is enabled by default; diagnostic export is user-initiated. |

### 8.3 Reliability

| ID | Requirement |
|---|---|
| NFR-020 | Startup is deterministic and has bounded timeouts for service, database, and media-tool readiness. |
| NFR-021 | Application quit and crash recovery do not corrupt active database or completed media. |
| NFR-022 | The previous supported release can open or recover from data created before a failed update according to the migration compatibility policy. |

### 8.4 Performance targets

These are beta targets and must be measured before becoming release guarantees.

| ID | Target |
|---|---|
| NFR-030 | Warm launch to interactive Library: target ≤ 5 seconds on the reference Mac. |
| NFR-031 | Idle desktop memory: target ≤ 450 MB on the reference Mac. |
| NFR-032 | UI remains responsive during import/transcription; long operations run outside the renderer event loop. |
| NFR-033 | Byte-range media seek begins without downloading the complete source file. |

### 8.5 Accessibility and usability

| ID | Requirement |
|---|---|
| NFR-040 | All first-run, Settings, recovery, backup, and update actions are keyboard accessible. |
| NFR-041 | Status is communicated by text/icon, not color alone. |
| NFR-042 | Destructive or irreversible-looking actions state exact impact and recovery. |
| NFR-043 | Platform-native dialogs use understandable filenames, filters, and default locations. |

### 8.6 Maintainability

| ID | Requirement |
|---|---|
| NFR-050 | Desktop and Server share domain behavior and core tests. |
| NFR-051 | Platform-specific behavior is isolated behind a small adapter boundary. |
| NFR-052 | Each release artifact is reproducible from a tagged commit and documented toolchain. |
| NFR-053 | Single-maintainer scope is preserved: Linux, mobile, SaaS, and new AI features remain separate decisions. |

## 9. Primary User Journeys

### Journey J1: Zero-terminal demo

1. User downloads the supported installer.
2. OS verifies the signed application.
3. App starts and initializes local data.
4. User chooses “Try the demo”.
5. User listens blind, reveals/navigates a sentence, saves one item, and sees the Review/Vault next step.
6. App explains that personal media transcription requires a provider key unless embedded subtitles are available.

Success: no terminal, `.env`, external provider call, or developer concept appears.

### Journey J2: Configure provider and import audio

1. User opens Settings and selects a provider.
2. User enters a key; app stores it securely.
3. User optionally runs an explicit connectivity check.
4. User imports a short owned audio file.
5. App reports processing stages and opens Practice.

Failure variants: invalid key, unreachable provider, quota, empty transcript, unsupported file, insufficient disk.

### Journey J3: Import video with embedded subtitles

1. User imports supported video.
2. App probes with packaged ffprobe and extracts audio with packaged FFmpeg.
3. Valid embedded subtitles bypass provider transcription.
4. Video, waveform, and subtitle clock remain synchronized.

### Journey J4: Upgrade safely

1. App reports update version and release notes.
2. App checks disk space and data health.
3. App creates and validates a backup.
4. Update installs and migrations run.
5. Health check confirms new version; otherwise recovery restores the previous safe state.

### Journey J5: Move from Mac to Windows

1. User creates a complete backup on macOS.
2. User installs a compatible Windows version.
3. Restore validates format/schema and imports to Windows AppData.
4. Library, media, notes, review state, and study history remain usable.

## 10. Success Metrics and Evidence

### 10.1 Product adoption metrics

No background telemetry is required for MVP. Evidence can be collected through consented usability sessions and opt-in issue templates.

| ID | Metric | Beta target |
|---|---|---|
| KPI-001 | Clean install success | 5/5 observed macOS beta participants |
| KPI-002 | Install-to-demo-practice completion | ≥ 80% without facilitator intervention |
| KPI-003 | Median install-to-first-demo action | ≤ 3 minutes after installer launch |
| KPI-004 | Provider setup recovery | ≥ 80% can correct one seeded configuration error using in-app guidance |
| KPI-005 | Upgrade data retention | 100% in controlled migration fixtures and beta upgrade checks |

### 10.2 Engineering evidence

- Shared `npm run verify` remains green.
- Platform package smoke builds run on native CI runners.
- Critical desktop E2E covers launch, first run, import, restart, backup/restore, and failure recovery.
- Data-safety fixtures compare database row counts, hashes/manifests, and media availability before/after migration.
- Release manifest records checksums and signing/notarization status.

## 11. Parallel Delivery Model

Implementation uses dependency waves. Work in the same wave may run in parallel only when file ownership does not overlap.

| Wave | Purpose | Parallel lanes |
|---|---|---|
| W0 | Resolve architecture uncertainty | standalone/Prisma spike; FFmpeg provenance spike; Electron security spike; usability fixture planning |
| W1 | Establish shared contracts | data-root/storage lane; configuration/secret lane; desktop shell lane; release CI skeleton lane |
| W2 | Implement platform-neutral foundations | media streaming; backup/migration; settings UX; health/diagnostics; standalone packaging |
| W3 | Integrate macOS feasibility | Electron bootstrap; packaged runtime assets; first run/demo; macOS smoke E2E |
| W4 | Harden macOS beta | signing/notarization; updater/rollback; accessibility/UX; user validation |
| W5 | Add Windows | platform assets/adapter; installer/signing; Windows E2E; cross-platform restore |
| W6 | Public release | release gate, docs/support, final adversarial review |

The executable task graph is maintained in [`tasks.md`](../openspec/changes/desktop-first-distribution/tasks.md).

## 12. Risks and Pre-mortem

Assume the initiative failed. The most likely causes are:

| Risk | Early signal | Mitigation |
|---|---|---|
| Next standalone cannot reliably package Prisma/media behavior | spike requires broad hacks or unpacked source tree | stop after W0 and reconsider local-service boundary or narrower backend extraction |
| Data migration damages the author's live library | plan proposes move/delete before verified copy | require copy-first fixture migration and Adversarial contract before active data testing |
| FFmpeg distribution creates legal or platform instability | binary provenance/license unclear | select and document a redistributable build before integrating binaries |
| Electron security is weakened for convenience | renderer requests Node integration or unrestricted IPC | treat security settings as release-blocking specs/tests |
| macOS implementation leaks platform assumptions | shell commands, hard-coded paths, direct Keychain calls spread into business code | enforce platform adapter and early Windows package smoke build |
| Packaging consumes all maintenance budget | frequent Electron/Prisma/native build failures | keep Server edition stable, restrict supported platforms/architectures, postpone AI expansion |
| Beautiful onboarding does not improve adoption | users still fail before first practice | measure clean-machine sessions and demo completion, not screenshots/build success |

## 13. Strongest Case Against This Plan

The strongest alternative is to stop at Docker/self-hosted distribution. It would reuse the current server architecture with lower packaging, signing, native binary, and updater burden. For a solo maintainer, that is materially cheaper and keeps focus on learning effectiveness.

The desktop plan survives this objection only because the intended audience includes non-technical learners and the core adoption problem is prerequisite/setup friction. If observed users are predominantly developers or are satisfied with Docker, or if the W0 spike reveals a large backend rewrite, the correct decision is to narrow Desktop to an experiment and invest in Server/Docker instead.

## 14. Open Decisions

| ID | Decision | Deadline |
|---|---|---|
| OD-001 | macOS Intel: separate x64 build, universal package, or unsupported beta | before M2 packaging |
| OD-002 | OS secret backend and Linux fallback policy (Linux remains unsupported) | before credential storage implementation |
| OD-003 | FFmpeg binary source, enabled codecs, and redistribution obligations | W0 exit |
| OD-004 | Update backend/channel hosting and signing-certificate budget | before M2 release work |
| OD-005 | Demo media source and attribution | before first-session implementation |
| OD-006 | Exact backup archive format and compatibility window | before backup implementation |

## 15. Requirement Traceability

- Normative behavior scenarios: `openspec/changes/desktop-first-distribution/specs/*/spec.md`
- Technical architecture and decisions: `openspec/changes/desktop-first-distribution/design.md`
- Implementation dependency graph and verification: `openspec/changes/desktop-first-distribution/tasks.md`
- Current shipped behavior: [`docs/requirement.md`](./requirement.md)
- Current shipped architecture: [`docs/architecture.md`](./architecture.md)
