# Changelog

All notable changes to DeepListener are documented here.

Version numbers align with the `version` field in `package.json`. Starting with `0.3.0-alpha.0`, each release is also tagged in Git so the version is auditable, not just a reconstructed milestone.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style categories where useful.

## [Unreleased]

## [0.3.0-alpha.1] - 2026-08-05

Unsigned macOS Apple Silicon internal alpha built from the current `main`
branch. This release replaces the older alpha package with the accumulated
desktop-readiness, first-session, media-import, recovery, and safety work.

### Added

- Added generic local MP4/WebM import without course-specific metadata or automatic lesson splitting.
- Added FFmpeg-derived MP3 audio, embedded-subtitle preference with transcription fallback, and synchronized video/waveform/sentence practice.
- Added streaming single-file media upload with actual-byte limits and local-only `public/videos/` storage.
- Added video import, subtitle parsing, shared-media playback, sync-boundary, database-backup, and upload-structure regression tests.
- Added an optional, default-off subtitle bar below video playback that follows the shared media clock and displays the current transcript sentence.

### Changed

- Kept Vault, Review, Shadowing, Library playback, and exports audio-first by retaining a derived `audioUrl` for video Tracks.
- Excluded original videos from Git and remote sync while keeping derived audio and SQLite metadata in the existing backup flow.
- Updated the media deletion path to remove both the original video and its derived audio.

### Verified

- `npm run lint`
- `npm run build`
- `npm run test:ci` (188 tests)
- Real MP4 streaming import, embedded-subtitle extraction, browser timeline seek, and dual-file cleanup
- Default-off subtitle toggle, current-sentence updates at 0.5s and 6.5s, and reset-to-hidden after reload on a real local video Track

## [0.3.0-alpha.0] - 2026-07-24

First release tagged in Git. Establishes the Electron desktop distribution
path so end users can run DeepListener without installing Node.js, Prisma, or
running terminal commands. Alpha: macOS Apple Silicon only, unsigned.

### Added

- Added the `desktop:dist` one-shot pipeline (`scripts/desktop-dist.mjs`) that chains the Next.js standalone build with `electron-builder` to produce a macOS dmg.
- Added `desktop/electron-builder.yml` with a `darwin-arm64` dmg target, hardened-runtime, and a drag-to-Applications dmg layout. Signing and notarization are opt-in via env (alpha ships unsigned).
- Added FFmpeg/ffprobe resolution in the Electron main process (`desktop/main.js`): env override → vendored `vendor/ffmpeg/{ffmpeg,ffprobe}` → system PATH, so media import works whether or not the user has a system FFmpeg install.
- Added optional vendored FFmpeg copy in `scripts/desktop-package.mjs` and a `vendor/ffmpeg/` directory with a README explaining when and how to vendor binaries.
- Added `description`, `keywords`, `repository`, `homepage`, `bugs`, and `author` to `package.json` so the project is discoverable on GitHub and npm search.

### Changed

- Corrected the documented default transcription provider: `TRANSCRIPTION_PROVIDER` defaults to `deepgram` (matching `src/lib/transcription/factory.ts`), not `openai`. Fixed in `README.md`, `.env.example`, `docs/requirement.md`, and `docs/maintenance.md`.
- Corrected the README claim that DeepListener does not bundle demo media: a synthetic 5-second FFmpeg-generated demo clip already ships under `public/demo/` so a first session works without a provider key.
- Stopped hard-coding the maintainer's absolute path in `scripts/codex-hooks/deeplistener-quality-gate.mjs`; the project root now resolves from the script location with an env override.

### Verified

- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `node --check` on every changed `.mjs`/`.js` script (`desktop-package.mjs`, `desktop-dist.mjs`, `desktop/main.js`, `deeplistener-quality-gate.mjs`)

## [0.2.0] - 2026-06-30

### Added

- Added system-aware light/dark theming with `next-themes`.
- Added a top-right day/night icon toggle in the global sticky nav.
- Added `ThemeProvider` and `ThemeToggle` under `src/components/theme/`.
- Added dark-mode regression coverage for provider configuration, layout integration, toggle behavior, and global dark compatibility styles.
- Added agent-harness session evidence for the dark-mode sprint under `docs/agent-harness/sessions/2026-06-30-dark-mode/`.

### Changed

- Updated the global design tokens in `src/app/globals.css` so backgrounds, cards, popovers, borders, inputs, primary actions, charts, and sidebar colors work in dark mode.
- Normalized the main Library, Vault, Dashboard, Review, Practice, AudioPlayer, Shadowing, editor, modal, and toolbar surfaces toward semantic theme classes.
- Preserved the existing white UI as the light theme while adding a `.dark` compatibility bridge for older Tailwind utility classes.
- Updated current architecture, PRD, maintenance, README, and docs map entries to document the theme system.

### Verified

- `npm run lint`
- `npm run build`
- `npm run test:ci`
- Targeted theme, shadowing, library, vault, review, and rendering-policy tests
- Browser checks for `/library`, `/vault`, `/dashboard`, and `/review` in dark and light flows

## [0.1.0] - 2026-06-30

### Added

- Added the optimization / agent harness workflow and session evidence for safety-critical refactors.
- Added documentation map and refreshed current architecture, PRD, and maintenance docs against live source.
- Added engineering governance review material for long-running quality work.
- Added dictation mode to the Shadowing console.

### Changed

- Split Shadowing, Review, Vault, Dashboard, and rich-text editor code into smaller tested helpers/components.
- Centralized client response parsing and safer download handling across Library, Review, Vault, uploads, export, autosave, and Shadowing text-save flows.
- Hardened setup and quality-gate scripts, including project build routing through `scripts/next-build.mjs`.
- Hardened API data contracts with Zod schemas and client-safe server error responses.
- Hardened local-day semantics for study time, dashboard, review, and Vault due windows.
- Updated docs and evidence after audit remediation.

### Fixed

- Prevented false-success UI states when Library, Vault, Review, upload, export, and autosave mutations fail.
- Made audio and library exports fail clearly when selected source audio is missing or invalid.
- Kept Shadowing controls stable in layout after the dictation and component split work.
- Preserved `.env*`, `prisma/dev.db`, and `public/uploads/` as protected local data boundaries in project governance.

## [0.0.9] - 2026-05-17

### Added

- Added Library audio export with category and date filters.
- Added AI coding quality, codebase assessment, and engineering-governance review documents.

### Changed

- Updated the dashboard target date and Next.js runtime.
- Improved Shadowing UX and editor behavior around caret stability.

### Fixed

- Resolved caret jumping in note editors.
- Stabilized Shadowing UX without breaking existing note shortcuts.

## [0.0.8] - 2026-04-04

### Added

- Added Symphony local tooling, workflow configuration, and dashboard/state endpoints.
- Added project roadmap, value, and optimization analysis documents.

### Changed

- Aligned PRD, architecture, and remaining docs with current implementation at that point.
- Stabilized app workflows around the new Symphony scaffolding.

## [0.0.7] - 2026-03-30

### Added

- Added multi-track selection and loop playback to Library.
- Added documentation for multi-track loop playback.
- Added repository contributor guide.
- Added default `Vocab` tag behavior for new Vault notes.
- Added F8 color shortcut and wider diagnosis modal behavior in note editing.
- Added additional keyboard shortcuts and UI detail refinements.

### Changed

- Unified Vault filter state for display and export.
- Improved Shadowing console action-button positioning and later stabilized its UI without breaking note shortcuts.

### Fixed

- Reduced Shadowing layout instability around controls and action buttons.

## [0.0.6] - 2026-03-06

### Added

- Added URL-based Track filtering to Vault.
- Added Play All sequential playback with a sticky floating bar.
- Added difficulty and Track filters to Vault export buttons.
- Added filtered audio export by difficulty and Track IDs.
- Added View Notes links from Track cards and Practice page headers.
- Added design and implementation plan docs for Vault Track filtering, Play All, and export enhancements.

### Changed

- Removed the old `take: 100` Vault export limit.
- Narrowed export button item types and clarified filtered export data boundaries.

### Fixed

- Excluded archived items from export counts and Track filter chips.
- Normalized `audioUrl` leading slash before path validation in export.
- Added input validation for filtered export difficulties and Track IDs.
- Fixed empty-state behavior when Vault is filtered by Track.
- Added unmount cleanup and audio playback rejection handling for Play All.

## [0.0.5] - 2026-03-03

### Added

- Added comprehensive learning analytics dashboard.

### Changed

- Improved type safety, security, and performance across the codebase.
- Enhanced the FSRS algorithm and optimized database queries.

## [0.0.4] - 2026-02-08

### Added

- Added Anki-style short-interval relearning for Again and Hard ratings.
- Added architecture diagram and review-system documentation updates.
- Improved Review page interaction design.

### Changed

- Enhanced FSRS-4.5 review behavior with sorting and statistics display.
- Simplified Review header counts after due-count investigations.

### Fixed

- Corrected Review statistics and due-count logic.
- Removed an old 50-item review statistics limit.

## [0.0.3] - 2026-02-06

### Added

- Added audio export API and export buttons for Vault, Review, and Track Practice.
- Added archived ReviewItem support, archive toggle API, Vault archive filters, and Review archive actions.
- Added FSRS-based review/vault experience upgrades.
- Added rich-text note editor and categorized text export.
- Added batch audio upload.
- Added audio export design and documentation.

### Changed

- Switched the Reveal Answer shortcut to Space.
- Disabled stale Next.js cache paths that made due counts appear inaccurate after refresh.
- Relaxed legacy lint backlog only as a temporary cleanup step recorded in history.

### Fixed

- Optimized audio export to avoid memory-limit failures.
- Fixed Again infinite-loop behavior and Analytics statistics.
- Fixed Review Statistics timezone and past-due visibility issues.
- Fixed note editor display, flicker, cursor jumping, and modal load behavior through several iterations.
- Ensured archived items are filtered from Review and export flows.
- Prevented Again items from reappearing immediately after refresh.
- Kept Shadowing Next from auto-recording unexpectedly.

## [0.0.2] - 2026-02-01

### Added

- Added sentence formatting metadata and APIs.
- Added `InteractiveText` and notation toolbar integration.
- Enabled read-only notation in Player and Review pages.
- Added comprehensive Shadowing upgrades: focus trap, regions, editable text, notes, keyboard shortcuts, and restart flow.
- Added comprehensive study-time tracking.

### Changed

- Clarified Review session progress and total count.
- Simplified dashboard code after layout stabilization.
- Updated dev log and finalized phonetic notation documentation.

### Fixed

- Fixed MiniWavePlayer AbortError noise.
- Fixed Shadowing loop delay, interrupt logic, playback-rate controls, and missing note edit data.
- Fixed Review item tag loading for editing.
- Fixed Recharts SSR and dimension/layout warnings.
- Fixed dashboard layout imbalance.

## [0.0.1] - 2026-01-30

### Added

- Added the initial DeepListener product foundation: upload, transcription, sentence-level practice, AudioPlayer, Shadowing, Vault notes, Review logging, and category/track notes.
- Added multi-provider STT foundations and network/proxy fixes.
- Added archive, blind mode, Shadowing v2, and mobile UI optimizations.
- Added note difficulty levels, error tags, and performance optimizations.
- Added `isLearnt`, `UNLEARNT`, and the multi-stage Track status workflow.
- Added variable playback speed support from 0.5x to 2.0x.
- Added the first analytics/dashboard workflow and streaming/page-load performance work.

### Changed

- Modularized AudioPlayer and ShadowingConsole into hooks and components.
- Added database indexing and pagination limits for initial performance stabilization.
- Updated README and changelog after the first feature wave.

### Fixed

- Fixed early Shadowing layout and recording-state leakage issues.
- Ensured new uploads default to the intended Track status.

## [0.0.0] - 2026-01-24

### Added

- Initial repository commit.
