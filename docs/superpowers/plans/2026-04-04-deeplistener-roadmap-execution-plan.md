# DeepListener Value-First Roadmap Execution Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the value-first roadmap into an execution-ready program that upgrades DeepListener from a strong listening practice app into a durable, personalized listening training platform.

**Architecture:** Execute in four ordered chunks. First, build platform boundaries and service abstractions so future work stops accumulating inside pages and route handlers. Second, add the highest-value training-engine upgrades that improve actual learning outcomes. Third, layer individualized intelligence on top of the structured data. Fourth, invest in long-term compounding systems such as curricula, knowledge relationships, sync, and offline support.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, SQLite, Zod, Web Audio API, WaveSurfer.js, ts-fsrs, ffmpeg, optional background job/search infrastructure

---

## Chunk 1: Platform Foundation

### Project 1: Establish domain and service boundaries

**Outcome:** Core business logic lives in reusable services instead of page files and route handlers.

**Files:**
- Create: `src/lib/services/ingestion/track-ingestion-service.ts`
- Create: `src/lib/services/review/review-grading-service.ts`
- Create: `src/lib/services/vault/vault-service.ts`
- Create: `src/lib/services/export/export-planning-service.ts`
- Create: `src/lib/services/analytics/study-time-service.ts`
- Create: `src/lib/services/dashboard/dashboard-service.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/review/grade/route.ts`
- Modify: `src/app/api/vault/route.ts`
- Modify: `src/app/api/audio/export/route.ts`
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/lib/services/review/review-grading-service.test.ts`
- Test: `src/lib/services/export/export-planning-service.test.ts`
- Test: `src/lib/services/dashboard/dashboard-service.test.ts`

- [ ] Create the `src/lib/services/` directory tree aligned to the six target domains.
- [ ] Move review grading logic out of [route.ts](/Users/leozhou/git/DeepListener/src/app/api/review/grade/route.ts) into `review-grading-service.ts`.
- [ ] Move vault upsert logic out of [route.ts](/Users/leozhou/git/DeepListener/src/app/api/vault/route.ts) into `vault-service.ts`.
- [ ] Move export segment gathering and filtering logic out of [route.ts](/Users/leozhou/git/DeepListener/src/app/api/audio/export/route.ts) into `export-planning-service.ts`.
- [ ] Move dashboard aggregation logic out of [page.tsx](/Users/leozhou/git/DeepListener/src/app/dashboard/page.tsx) into `dashboard-service.ts`.
- [ ] Update the route/page callers to become thin transport layers over service calls.
- [ ] Add focused service tests before broadening functionality.
- [ ] Verify with `node --import tsx --test src/lib/services/review/review-grading-service.test.ts src/lib/services/export/export-planning-service.test.ts src/lib/services/dashboard/dashboard-service.test.ts`.

### Project 2: Add request validation and shared error contracts

**Outcome:** Every API route validates input explicitly and returns predictable error shapes.

**Files:**
- Create: `src/lib/contracts/api-error.ts`
- Create: `src/lib/contracts/upload-contract.ts`
- Create: `src/lib/contracts/review-contract.ts`
- Create: `src/lib/contracts/vault-contract.ts`
- Create: `src/lib/contracts/export-contract.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/review/grade/route.ts`
- Modify: `src/app/api/vault/route.ts`
- Modify: `src/app/api/vault/export/route.ts`
- Modify: `src/app/api/audio/export/route.ts`
- Test: `src/app/api/review/grade/route.test.ts`
- Test: `src/app/api/vault/route.test.ts`
- Test: `src/app/api/vault/export/route.test.ts`

- [ ] Define a shared API error format with stable `code`, `message`, and optional `details`.
- [ ] Create Zod-backed request contracts for upload, review, vault save, notes export, and audio export.
- [ ] Validate request bodies at the route boundary before touching services.
- [ ] Normalize route error handling so contract validation failures and domain failures are distinguishable.
- [ ] Add contract tests for the upgraded routes.
- [ ] Verify with `npm run lint` and targeted route tests.

### Project 3: Refactor the dashboard and study-time pipeline

**Outcome:** Analytics data becomes reliable enough to support recommendation and profile features.

**Files:**
- Create: `src/lib/services/analytics/study-session-aggregator.ts`
- Create: `src/app/dashboard/queries.ts`
- Create: `src/app/dashboard/selectors.ts`
- Modify: `src/contexts/TimeTrackingContext.tsx`
- Modify: `src/app/api/study-time/route.ts`
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/contexts/TimeTrackingContext.test.tsx`
- Test: `src/app/api/study-time/route.test.ts`
- Test: `src/app/dashboard/page-data.test.ts`

- [ ] Replace the implicit “DOM contains playing audio” heartbeat model with explicit session events: start, heartbeat, stop.
- [ ] Add a server-side aggregation layer so dashboard calculations stop living inside [page.tsx](/Users/leozhou/git/DeepListener/src/app/dashboard/page.tsx).
- [ ] Split analytics fetching from chart-data shaping.
- [ ] Add tests around study-time aggregation and dashboard metric derivation.
- [ ] Verify with `node --import tsx --test src/app/dashboard/DashboardTabs.test.ts src/app/dashboard/page-data.test.ts`.

### Project 4: Stabilize large interactive clients by splitting responsibilities

**Outcome:** The highest-complexity UI files become easier to extend without regression.

**Files:**
- Modify: `src/app/vault/VaultListClient.tsx`
- Create: `src/app/vault/vault-selectors.ts`
- Create: `src/app/vault/useVaultPlayback.ts`
- Create: `src/app/vault/useVaultFilters.ts`
- Modify: `src/app/review/ReviewClient.tsx`
- Create: `src/app/review/useReviewPlayback.ts`
- Create: `src/app/review/useReviewSession.ts`
- Modify: `src/components/feature/ShadowingConsole.tsx`
- Create: `src/components/feature/shadowing/useShadowingCommands.ts`
- Create: `src/components/feature/shadowing/useShadowingDraftState.ts`
- Test: `src/app/vault/VaultListClient.test.ts`
- Test: `src/app/review/ReviewClient.test.ts`
- Test: `src/components/feature/ShadowingConsole.test.ts`

- [ ] Extract Vault filtering/sorting/search and playback into dedicated hooks/selectors.
- [ ] Extract Review playback and review-session mutation logic from [ReviewClient.tsx](/Users/leozhou/git/DeepListener/src/app/review/ReviewClient.tsx).
- [ ] Split Shadowing keyboard commands and draft state from [ShadowingConsole.tsx](/Users/leozhou/git/DeepListener/src/components/feature/ShadowingConsole.tsx).
- [ ] Keep UI behavior unchanged while reducing the responsibility footprint of each container.
- [ ] Re-run the existing targeted UI tests after each split.

### Project 5: Prepare background-job infrastructure

**Outcome:** Long-running work no longer depends on synchronous route execution.

**Files:**
- Create: `prisma/migrations/<timestamp>_add_job_table/migration.sql`
- Modify: `prisma/schema.prisma`
- Create: `src/lib/services/jobs/job-service.ts`
- Create: `src/lib/services/jobs/job-types.ts`
- Create: `src/app/api/jobs/[id]/route.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/audio/export/route.ts`
- Test: `src/lib/services/jobs/job-service.test.ts`

- [ ] Add a `Job` model that can represent queued, running, failed, and completed work.
- [ ] Implement a first-pass job service API for enqueue, claim, update-progress, and finalize.
- [ ] Refactor upload transcription and audio export to support queued execution as the future default.
- [ ] Expose job status polling through `/api/jobs/[id]`.
- [ ] Verify with Prisma migration, targeted job tests, and `npm run build`.

## Chunk 2: Training Engine Upgrades

### Project 6: Replace flat error tags with structured diagnosis

**Outcome:** The system captures why a sentence failed, not just a loose tag list.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_structured_diagnosis/migration.sql`
- Create: `src/lib/services/diagnosis/diagnosis-service.ts`
- Create: `src/lib/services/diagnosis/diagnosis-types.ts`
- Modify: `src/components/feature/DiagnosisModal.tsx`
- Modify: `src/app/api/vault/route.ts`
- Modify: `src/app/review/ReviewClient.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/components/feature/DiagnosisModal.test.ts`
- Test: `src/lib/services/diagnosis/diagnosis-service.test.ts`

- [ ] Introduce structured diagnosis fields for primary cause, secondary causes, layer, and revision state.
- [ ] Upgrade the diagnosis UI to capture the richer structure without making the flow slower.
- [ ] Persist diagnosis through the vault save/update path.
- [ ] Expose diagnosis aggregates to review and dashboard surfaces.
- [ ] Verify with UI tests plus diagnosis service tests.

### Project 7: Build a personalized training queue

**Outcome:** The app can tell the user what to train next instead of depending on manual browsing.

**Files:**
- Create: `src/lib/services/training-queue/training-queue-service.ts`
- Create: `src/lib/services/training-queue/training-queue-types.ts`
- Create: `src/app/api/training-queue/route.ts`
- Create: `src/app/training/page.tsx`
- Create: `src/app/training/TrainingQueueClient.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/lib/services/training-queue/training-queue-service.test.ts`
- Test: `src/app/training/TrainingQueueClient.test.tsx`

- [ ] Define queue modes: fix-errors, reinforce-recent, transfer-patterns, and goal-focused drill.
- [ ] Score candidate sentences using review history, diagnosis data, stability, topic diversity, and recency.
- [ ] Add a dedicated training queue surface instead of hiding recommendations inside existing pages.
- [ ] Promote “today’s next best training set” into the home/dashboard entry flow.
- [ ] Verify with service-level queue scoring tests and UI smoke tests.

### Project 8: Add shadowing feedback infrastructure

**Outcome:** Shadowing evolves from replay-only into feedback-based practice.

**Files:**
- Create: `src/lib/services/shadowing-analysis/shadowing-analysis-service.ts`
- Create: `src/lib/services/shadowing-analysis/prosody-types.ts`
- Create: `src/components/feature/shadowing/feedback/presentation.ts`
- Create: `src/components/feature/shadowing/feedback/ShadowingFeedbackPanel.tsx`
- Modify: `src/components/feature/ShadowingConsole.tsx`
- Modify: `src/components/feature/shadowing/useAudioRecorder.ts`
- Modify: `src/lib/audio-utils.ts`
- Test: `src/lib/services/shadowing-analysis/shadowing-analysis-service.test.ts`
- Test: `src/components/feature/ShadowingConsole.test.ts`

- [ ] Define the analysis output contract for timing, pause, speed, stress, and local retry suggestions.
- [ ] Persist or compute enough recording metadata to compare original and user audio deterministically.
- [ ] Add a feedback panel to the Shadowing UI without breaking the fast loop.
- [ ] Start with deterministic heuristics and reserve model-based grading for a later iteration.
- [ ] Verify with deterministic analysis tests and targeted UI regression tests.

### Project 9: Introduce precision-training modes

**Outcome:** Practice expands beyond listening/shadowing into forced parsing and recall.

**Files:**
- Create: `src/app/drills/page.tsx`
- Create: `src/app/drills/DrillClient.tsx`
- Create: `src/lib/services/drills/drill-generator.ts`
- Create: `src/lib/services/drills/drill-types.ts`
- Create: `src/components/feature/drills/ClozeDrill.tsx`
- Create: `src/components/feature/drills/DictationDrill.tsx`
- Create: `src/components/feature/drills/ReconstructionDrill.tsx`
- Test: `src/lib/services/drills/drill-generator.test.ts`
- Test: `src/app/drills/DrillClient.test.tsx`

- [ ] Generate drill payloads from existing sentence, formatting, diagnosis, and review data.
- [ ] Implement three first-class drill modes: dictation, cloze, and sentence reconstruction.
- [ ] Make drill results feed back into review/diagnosis signals instead of remaining isolated.
- [ ] Verify with generator tests and client-mode tests.

## Chunk 3: Individualized Intelligence

### Project 10: Build the listener profile and weakness map

**Outcome:** The system can explain where the user is weak, not just what they studied.

**Files:**
- Create: `src/lib/services/profile/listener-profile-service.ts`
- Create: `src/lib/services/profile/listener-profile-types.ts`
- Create: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/DashboardTabs.tsx`
- Test: `src/lib/services/profile/listener-profile-service.test.ts`

- [ ] Define profile slices across diagnosis, topic, sentence complexity, shadowing performance, and review retention.
- [ ] Generate weakness summaries and improvement summaries from raw events.
- [ ] Add a profile-focused dashboard surface that turns data into actions.
- [ ] Verify with profile aggregation tests.

### Project 11: Upgrade retrieval and search

**Outcome:** Stored content remains usable as the corpus grows.

**Files:**
- Create: `src/lib/services/search/search-service.ts`
- Create: `src/lib/services/search/search-index.ts`
- Create: `src/app/api/search/route.ts`
- Create: `src/app/search/page.tsx`
- Create: `src/app/search/SearchClient.tsx`
- Modify: `src/app/library/LibraryManager.tsx`
- Modify: `src/app/vault/VaultListClient.tsx`
- Test: `src/lib/services/search/search-service.test.ts`
- Test: `src/app/search/SearchClient.test.tsx`

- [ ] Add exact filtering and full-text search as the first baseline.
- [ ] Add sentence-similarity and pattern-similarity search on top of the structured diagnosis/training data.
- [ ] Integrate search entry points into Library and Vault instead of making them siloed.
- [ ] Verify with search service tests and search-page tests.

### Project 12: Turn export into a smart listening pack generator

**Outcome:** Exported audio becomes a training product, not just a utility.

**Files:**
- Modify: `src/lib/services/export/export-planning-service.ts`
- Modify: `src/app/api/audio/export/route.ts`
- Modify: `src/app/vault/ExportButtons.tsx`
- Create: `src/lib/services/export/pack-strategies.ts`
- Create: `src/app/vault/pack-presets.ts`
- Test: `src/lib/services/export/export-planning-service.test.ts`

- [ ] Add pack strategies for weak-point review, today-extension, topic reinforcement, and commute-length packs.
- [ ] Make export UI preset-driven instead of only filter-driven.
- [ ] Reuse queue and profile signals in pack selection.
- [ ] Verify with export planning tests and UI regression tests.

## Chunk 4: Long-Term Compounding Systems

### Project 13: Add curriculum and path-based training

**Outcome:** Users can progress through thematic or skill-based paths instead of loose track collections.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_training_paths/migration.sql`
- Create: `src/lib/services/curriculum/curriculum-service.ts`
- Create: `src/app/paths/page.tsx`
- Create: `src/app/paths/[id]/page.tsx`
- Create: `src/app/paths/PathClient.tsx`
- Test: `src/lib/services/curriculum/curriculum-service.test.ts`

- [ ] Add data structures for paths, levels, and path membership.
- [ ] Support both theme-based paths and skill-based paths.
- [ ] Integrate path progress with personalized queue generation.
- [ ] Verify with service tests and path-page smoke tests.

### Project 14: Build the sentence knowledge graph

**Outcome:** The system can reason over relationships among sentences and use them for recommendation.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_sentence_graph/migration.sql`
- Create: `src/lib/services/knowledge-graph/sentence-graph-service.ts`
- Create: `src/lib/services/knowledge-graph/graph-types.ts`
- Create: `src/app/graph/page.tsx`
- Test: `src/lib/services/knowledge-graph/sentence-graph-service.test.ts`

- [ ] Define relationship types such as same topic, same pronunciation issue, same syntax pattern, and same failure pattern.
- [ ] Build graph construction logic from existing metadata and diagnosis signals.
- [ ] Reuse graph edges in training queue, search, and profile explanations.
- [ ] Verify with graph service tests.

### Project 15: Add sync, offline, and continuity foundations

**Outcome:** The platform becomes durable for long-term daily use across contexts.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/services/sync/sync-service.ts`
- Create: `src/components/feature/PWARegistration.tsx`
- Create: `src/app/api/sync/route.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Test: `src/lib/services/sync/sync-service.test.ts`

- [ ] Define the source of truth and conflict policy for notes, review actions, diagnosis edits, and sessions.
- [ ] Extend the existing PWA registration path toward offline asset/data support.
- [ ] Add continuity guarantees for queue state, study history, and saved packs.
- [ ] Verify with sync-service tests and manual offline smoke testing.

## Recommended Order

- [ ] Complete all of Chunk 1 before starting queueing, profile, or advanced analytics.
- [ ] Within Chunk 2, implement Project 6 before Projects 7, 10, 11, or 12.
- [ ] Implement Project 7 before Project 12 so smart packs can reuse queue logic.
- [ ] Implement Project 10 before trying to ship recommendation-heavy surfaces.
- [ ] Implement Project 14 only after diagnosis, search, and profile data are structurally reliable.

## Phase Gates

### Gate A: Foundation complete
- [ ] `src/lib/services/` exists and owns the main business logic paths.
- [ ] Route inputs are schema-validated.
- [ ] Study-time and dashboard metrics are service-driven.
- [ ] Long-running routes have a job abstraction path.

### Gate B: Training engine complete
- [ ] Structured diagnosis is live.
- [ ] Personalized training queue is usable.
- [ ] Shadowing exposes feedback signals.
- [ ] Drill modes exist and write data back into the learning model.

### Gate C: Intelligence complete
- [ ] Listener profile explains weaknesses and progress.
- [ ] Search works across exact, text, and similarity use cases.
- [ ] Smart listening packs can be generated from learning signals.

### Gate D: Compounding platform complete
- [ ] Path-based learning exists.
- [ ] Sentence relationship graph exists.
- [ ] Offline/sync foundations protect long-term usage.

## Verification Baseline

- [ ] Run `npm run lint` after each project.
- [ ] Run `npm run build` at the end of each chunk.
- [ ] Add or update targeted tests for every new service and client surface.
- [ ] Maintain at least one end-to-end workflow check across upload, practice, vault, review, and export before closing each major chunk.

## Outcome

If the plan is executed in order, DeepListener stops being a collection of strong point-features and becomes:

- a training platform with explicit domain boundaries
- a listening system that understands failure patterns
- a coach-like product that recommends the next best practice
- a durable personal knowledge and growth system for advanced listening training
