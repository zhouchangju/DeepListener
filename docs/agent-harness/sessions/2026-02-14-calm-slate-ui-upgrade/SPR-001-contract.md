# SPR-001 Contract: Calm Slate UI Upgrade

## Goal
Implement "Calm Slate" visual direction + approved UX quick wins. Zero data loss; no behavior changes beyond listed scope.

## In Scope
- globals.css token rework (cold-hue light grays, slate-blue dark, layered shadow tokens, success/warning tokens, radius 0.5rem)
- Fix 15 `text-primary/15|25|50` low-visibility text instances (6 files)
- tabular-nums on key numerals (countdown, review counts, durations, sentence index)
- button.tsx: transition-colors + active:scale; card shadow token; hover translateY on TrackList/NotesList
- ReviewCard + shadowing red/amber hard-coded colors → theme-aware
- Main player keyboard: ←/→ sentence nav, L loop, S shadowing (extend useAudioInteractions)
- Streak in global nav (new GET /api/streak + NavStreak component)
- Completion moments: shadowing session summary; review queue-empty completion card
- i18n keys en + zh-CN for all new strings

## Out of Scope
- prisma schema/dev.db, public/uploads, public/videos, .env*, sync scripts
- lint/test/build config changes
- restructuring pages/components beyond listed edits

## Verification
- Targeted: node --import tsx --test on touched domains' tests
- Gate: npm run verify:quick (lint + test:ci)

## Rollback
All changes are in git working tree; revert via git checkout -- <files>. No data files touched.
