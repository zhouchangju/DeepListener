# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | `2026-07-22-open-source-onboarding` |
| Domain | Onboarding / UI / diagnostics / upload errors |
| Owner | AI Agent |
| Date | 2026-07-22 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Product landing page | `src/app/page.tsx` | A stranger can understand the learning loop and choose Setup or Library. |
| FEAT-002 | Read-only setup diagnostics | `src/app/setup/**`, `src/lib/setup-readiness*` | Reports environment readiness without changing local state or exposing secrets. |
| FEAT-003 | Recovery-oriented first use | Library empty state and upload error handling | Empty and failed states identify a concrete next step. |
| FEAT-004 | Truthful onboarding docs | README and architecture docs | Routes and limitations match the implementation. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Docker Compose | Requires a separate deployment/data-persistence contract. |
| OOS-002 | Bundled demo media | Copyright/provenance and seed-data behavior require explicit assets and review. |
| OOS-003 | AI diagnosis or shadowing feedback | Product feature work should follow successful onboarding. |
| OOS-004 | Provider connectivity test | It would make a credentialed external request and may incur cost. |

## Acceptance

| ID | Requirement | Evidence |
|---|---|---|
| AC-001 | `/` is a landing page, not a redirect. | targeted source test and production build |
| AC-002 | `/setup` checks Node, SQLite initialization, media writability, FFmpeg/ffprobe, provider configuration, and network-exposure boundary. | unit tests |
| AC-003 | No check prints key values or writes files. | source review |
| AC-004 | Upload failures preserve actionable server messages and use a provider-neutral fallback. | targeted test |
| AC-005 | Existing repository verification gate passes. | `npm run verify` |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/` | Load in light and narrow viewport | Hero, workflow, boundaries, and CTAs remain readable. |
| BV-002 | `/setup` | Load with current local environment | Six checks render without credential values. |
| BV-003 | `/library` | Inspect empty-state implementation | Setup recovery link is present when there are no tracks. |

## Rollback

| Area | Rollback |
|---|---|
| Source/docs | Revert files changed by SPR-001. |
| Data/deploy | N/A; neither is changed. |
