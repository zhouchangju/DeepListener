# Desktop-first Distribution Proposal

## Why

DeepListener already has a differentiated learning loop, but a new learner must currently install Node.js and FFmpeg, initialize Prisma, edit `.env`, provide media, and run a development-style server before experiencing that loop. The source can be opened today, but the distribution path excludes most non-technical English learners.

The proposed change makes a desktop application the primary learner distribution while preserving the current self-hosted application for contributors and advanced operators. The first feasibility target is macOS Apple Silicon because it matches the maintainer's active development environment and minimizes the cost of validating the end-to-end packaging model. Windows x64 follows after the shared desktop runtime is proven; it is not a separate product or codebase.

## User-value Hypothesis

If DeepListener installs as a signed desktop application that bundles its runtime and media tools, initializes its own local data, accepts provider configuration in the UI, and includes a legally cleared demo path, then a non-technical learner can reach the first sentence-level practice loop without a terminal. This should materially increase first-session completion relative to the repository setup path.

The hypothesis is not considered proven by a successful package build. It requires observed clean-machine installation and first-session evidence from target users.

## What Changes

- Add a portable runtime contract for database, media, exports, backups, logs, and configuration outside the repository/install directory.
- Add secure media streaming from the writable data directory, including byte-range behavior required by video and waveform seeking.
- Add an Electron shell that starts the existing Next.js application as a loopback-only standalone service and loads it in a sandboxed renderer.
- Add desktop settings for transcription provider selection and credential management without requiring `.env` editing.
- Add automatic first-run database initialization, versioned migration, pre-migration backup, health checks, and recovery behavior.
- Bundle or provision platform-specific FFmpeg/ffprobe and Prisma runtime assets with explicit provenance and license evidence.
- Add a macOS Apple Silicon feasibility build, followed by signed macOS beta distribution and Windows x64 support through the same platform abstractions.
- Add deterministic packaging, installer, upgrade, backup/restore, and critical-user-flow verification.
- Preserve the current Server edition and keep shared product behavior in the existing Next.js/domain code.

## Capabilities

| Capability | Delta spec | Outcome |
|---|---|---|
| Portable data runtime | `specs/portable-data-runtime/spec.md` | Runtime state lives in an explicit writable data root and can be migrated/backed up safely |
| Desktop application shell | `specs/desktop-application-shell/spec.md` | Electron securely hosts the existing application without exposing Node privileges to the renderer |
| Desktop configuration and secrets | `specs/desktop-configuration-and-secrets/spec.md` | Users configure providers in the UI and secrets remain outside browser-visible state |
| Desktop media runtime | `specs/desktop-media-runtime/spec.md` | Audio/video import, playback, seeking, FFmpeg processing, and export work from packaged storage |
| Lifecycle and recovery | `specs/desktop-lifecycle-and-recovery/spec.md` | First run, migration, restart, backup, restore, and failure recovery preserve user data |
| Release distribution | `specs/desktop-release-distribution/spec.md` | macOS-first and Windows-second builds are reproducible, signed where required, and verifiable |
| First-session experience | `specs/desktop-first-session/spec.md` | A learner reaches a legal demo and first practice without terminal setup |

## Impact

### Expected code surfaces

- `next.config.ts`, build scripts, package scripts, and future Electron/Forge entry points.
- Runtime/config/storage helpers under `src/lib`.
- Upload, media serving, export, setup, and settings routes/components.
- Prisma connection and migration/bootstrap tooling; schema changes only if storage identifiers must replace public URLs.
- Cross-platform CI, packaging configuration, signing/release documentation, and desktop E2E tests.

### Data and compatibility

- Existing `prisma/dev.db`, `public/uploads`, and `public/videos` are protected legacy data.
- The first desktop migration must be copy-first, verified, resumable, and non-destructive; the Server edition must keep a documented path.
- A single backup format must be portable between supported desktop platforms when media filenames and provider-independent data are valid.

### New dependencies and external obligations

- Electron and Electron Forge.
- Platform-specific runtime assets for Prisma and FFmpeg/ffprobe.
- macOS signing/notarization and Windows signing/update infrastructure.
- An OS-backed credential-storage implementation or a documented secure equivalent.

## Smallest Feasibility Test

Before broad refactoring, create a disposable macOS Apple Silicon spike that:

1. builds the current app as Next.js standalone;
2. starts it from an Electron main/utility process on `127.0.0.1` with a random port;
3. opens a sandboxed BrowserWindow;
4. reads and writes a disposable SQLite database under an application data directory;
5. locates packaged test FFmpeg/ffprobe binaries; and
6. imports and plays a synthetic or owned short media fixture.

The spike must not touch the active database or user media. Failure to package Prisma, stream media, or start the standalone service invalidates the assumed low-rewrite Electron path and triggers design review before implementation continues.

### Feasibility outcome (2026-07-22, W0 → Proceed)

The spike passed on darwin-arm64 with executable evidence and **no active-data
contact**: standalone launched from `mktemp` on loopback only; the packaged
Prisma engine connected to a disposable SQLite and ran full CRUD; a sandboxed
Electron renderer verified `nodeIntegration:false` / `contextIsolation:true` /
`sandbox:true` and a per-launch token that never reaches the renderer; FFmpeg
provenance selected a viable LGPL path. See
`docs/agent-harness/sessions/2026-07-22-desktop-feasibility/T050-feasibility-decision.md`.
Two packaging requirements (copy `.next/static`; bundle the Prisma
schema-engine) are carried into W2/W3.

## Non-goals

- No mobile client, Linux release, cloud sync, multi-user authentication, hosted SaaS, plugin marketplace, or app-store submission in this change.
- No generic AI chat, sentence diagnosis AI, or shadowing scoring before desktop distribution is validated.
- No redesign of the existing learning loop or replacement of Prisma/SQLite during packaging work.
- No immediate deletion of Server-edition paths or shell-based maintainer workflows.

## Rollback

- Desktop-specific build and shell code must remain additive until the portable data runtime passes compatibility tests.
- Existing Server edition remains the operational fallback throughout development.
- Data migration never deletes legacy sources automatically; rollback means closing the desktop app and reopening the original Server edition against unchanged legacy data.
- Release rollback restores the previous signed application version and the automatic pre-migration backup when schema compatibility requires it.

## Evidence Required Before Broad Promotion

- Clean-machine installer tests on supported architectures.
- Five target users complete install-to-first-practice observation without terminal assistance.
- Migration, restart, backup/restore, missing-media, invalid-key, and interrupted-upgrade paths are exercised.
- FFmpeg/Prisma redistribution provenance and licenses are documented.
- macOS and Windows use the same domain/storage contracts rather than platform forks.
