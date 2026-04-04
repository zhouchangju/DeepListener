# Lint Warning Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the current ESLint warning backlog without reintroducing build failures or masking runtime issues.

**Architecture:** Triage warnings by risk. Fix hook/state/lifecycle warnings first because they can hide real behavioral bugs, then remove unused code and dead parameters, and finally tighten explicit `any` usage with focused local types. Validate each batch with targeted lint commands and finish with full `npm run lint` and `npm run build`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, ESLint, Zod, Prisma

---

## Chunk 1: High-Risk React Warnings
- [x] Fix `react-hooks/set-state-in-effect` and `react-hooks/static-components` warnings in dashboard, audio, note editor, and shadowing workflow files.
- [x] Fix `react-hooks/exhaustive-deps` warnings where dependencies are genuinely missing or callbacks should be stabilized.
- [x] Remove `react-hooks/preserve-manual-memoization` warnings by simplifying unnecessary `useCallback` usage or aligning dependencies.
- [x] Run targeted lint for the touched files and then `npm run build`.

## Chunk 2: Unused Code Cleanup
- [x] Remove unused imports, parameters, and locals in app routes, components, service worker, and scripts.
- [x] Re-run targeted lint for touched files.

## Chunk 3: Typing Cleanup
- [x] Replace remaining `any` annotations with focused local types where inference is insufficient.
- [x] Re-run `npm run lint`.
- [x] Run `npm run build`.

## Outcome
- Warning backlog reduced from 74 to 0 without introducing new lint suppressions.
- Dashboard, review, vault, shadowing, audio-player, scripts, and transcription provider warnings were all cleaned in-place.
- Shared dashboard chart/data shapes were extracted into `src/app/dashboard/types.ts` to replace repeated `any` usage.
- Hook-heavy flows were reworked to satisfy React 19 lint rules with behavior-preserving state/resource boundaries.

## Verification
- `npm run lint`
- `npm run build`
- `node --import tsx --test src/app/dashboard/DashboardTabs.test.ts src/app/vault/VaultListClient.test.ts src/components/feature/EditVaultModal.test.ts src/components/feature/shadowing/presentation.test.ts`
