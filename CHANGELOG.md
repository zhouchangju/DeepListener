# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
