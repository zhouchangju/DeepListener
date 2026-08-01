# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-07-29-landing-waveform-cache |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-07-29 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists, not modified by Git status | none | any write, migration, sync, or replacement |
| DATA-SAFE-002 | `public/uploads/` | exists, not modified by Git status | none | any write, delete, or sync |
| DATA-SAFE-003 | `public/videos/` | exists, not modified by Git status | none | any write, delete, commit, or sync |
| DATA-SAFE-004 | `.env*` | out of scope | none | any read or edit |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Landing/PWA cache correctness | `public/sw.js`, focused regression test, harness records | database, media, environment, APIs, sync, deployment config, unrelated UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Uploaded media and icons remain cache-first | source regression and inspection |
| AC-PRESERVE-002 | App static assets remain available from cache when offline | source regression and inspection |
| AC-PRESERVE-003 | Protected local data remains untouched | scoped Git status before and after |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | `/_next/static/` prefers a fresh network response so stale CSS cannot hide the landing waveform | focused test and browser verification |
| AC-CHANGE-002 | Existing v1 shell cache is invalidated without evicting the v1 media cache | cache version regression assertion |

## Verification

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/service-worker.test.ts src/app/onboarding.test.ts` | cache policy and landing contrast | yes | exits 0 |
| browser check on `/` | waveform visibility and computed bar dimensions | yes | visible bars |
| `npm run verify` | repository | yes | exits 0 |

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | restore only `public/sw.js` and remove this sprint's focused test/records | no data migration or media write |
