# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- fix: harden project safety and API/export failure contracts
  - Keep `bin/setup` from creating or editing `.env`, and apply existing Prisma migrations against `prisma/dev.db`
  - Make Library status/archive mutations surface rejected API responses instead of showing false success
  - Make audio and library exports fail with a 400 response when selected source audio is missing or invalid
  - Normalize study-time, dashboard, review, and Vault due windows around local-day semantics
  - Replace raw internal 500 error messages with the shared client-safe response helper
  - Split pure audio/Vault query helpers so tests avoid Prisma native side effects
  - Harden client export downloads with safer `Content-Disposition` filename parsing and link lifecycle tests
  - Centralize Track status display/options/fallback helpers and make Library consume the shared domain boundary
  - Extract Review keyboard shortcut mapping into a pure tested helper while preserving existing shortcut behavior
  - Promote client mutation response parsing into a shared helper used by Library and Review flows
  - Reuse shared client mutation response parsing for Vault delete/archive actions
  - Reuse shared client mutation response parsing for Vault edit note load/save actions
  - Reuse shared client mutation response parsing for track rename updates
  - Reuse shared client mutation response parsing for autosaved track/review notes
  - Reuse shared client mutation response parsing for Practice save-to-vault actions
  - Reuse shared client mutation response parsing for single-file upload failures
  - Reuse shared client mutation response parsing for batch upload top-level failures
  - Reuse shared client mutation response parsing for Shadowing sentence text saves
  - Reuse shared client response parsing for export download failures
  - Make touched Shadowing sentence state resets pass the zero-warning React hooks lint gate
  - Fix Codex quality gate command detection, route production builds through WASM fallbacks, and remove the stale alternate lockfile
- docs: add a documentation map and refresh current implementation docs
  - Add `docs/README.md` as the human-friendly navigation entry point
  - Refresh architecture, PRD, and maintenance docs against the current code
  - Move the relearning implementation note from the repository root into `docs/history/`

## [2026-02-06]
- fix: ensure note editors always display content on mount
  - Fix NoteEditor, ReviewNoteEditor, and RichTextNoteEditor to properly load saved notes
  - Replace forceUpdate-based approach with requestAnimationFrame for DOM readiness
  - Remove infinite loop caused by forceUpdate in dependency arrays
  - Add content diff checking to prevent unnecessary re-renders
  - Add user editing detection to prevent cursor jumping and flickering
- feat: improve note editors with copy button and proper state management
- fix: optimize audio export to prevent memory limit exceeded
- refactor: simplify code by removing redundant comments
- fix: resolve Again infinite loop and fix Analytics statistics
- fix: resolve dashboard layout imbalance and Recharts dimension warnings
  - Reorganize dashboard layout with unified grid structure for consistent card widths
  - Move Countdown card into DashboardContent to share grid system with progress cards
  - Remove redundant col-span classes and simplify grid hierarchy
  - Replace percentage-based chart heights with fixed pixel values (250px)
  - Add delayed dimension measurement in ChartWrapper to ensure proper layout
  - Eliminate Recharts width(-1) and height(-1) warnings completely

## [2026-01-30]
- feat: enhance shadowing mode (loop button, progress indicator, smart interrupt)
- perf: major optimization via DB indexing, pagination limits, and Suspense streaming
- feat: upgrade track status workflow (Unlearnt/Intensive/Shadowing...) and analytics dashboard
- fix: resolve critical recording state leakage in shadowing mode
- feat: add track editing (rename/type/topic) in practice page
- feat: implement basic review system with logging and grading API
- feat: add track-level notes and category management
- ui: add RenameTrackModal and enhanced NoteEditor
- feat: add review log migration and API endpoints

## [2026-01-27]
- feat: add variable playback speed support (0.5x-2.0x) to all modes

## [2026-01-26]
- feat: add 'isLearnt' track status and optimize AudioPlayer performance

## [2026-01-25]
- feat: implement note difficulty levels, new error tags, performance optimizations, and bug fixes
- refactor: modularize AudioPlayer and ShadowingConsole into hooks/components based on GEMINI.md standards
- feat: implement archive, blind mode, shadowing v2, and mobile UI optimizations
- feat: initial implementation of DeepListener with multi-provider STT, AudioPlayer重构, and network fixes

## [2026-01-24]
- Initial commit
