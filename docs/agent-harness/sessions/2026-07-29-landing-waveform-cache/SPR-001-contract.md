# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-07-29-landing-waveform-cache |
| Domain | Landing / PWA cache |
| Owner | AI Agent |
| Date | 2026-07-29 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Correct stale app-static caching | `public/sw.js`, `/` | latest JS/CSS is used online; cached copy remains an offline fallback |
| FEAT-002 | Add focused regression coverage | `src/lib/service-worker.test.ts`, existing landing test | cache routing and waveform contrast remain explicit |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Landing-page redesign | the DOM already contains and renders the intended waveform in a clean browser |
| OOS-002 | Data/media/environment changes | unrelated and protected |
| OOS-003 | Unrelated dirty-worktree changes | user-owned work |

## Acceptance

| ID | Requirement | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Media/icons remain cache-first | source test and inspection |
| AC-PRESERVE-002 | App static has an offline fallback | source test and inspection |
| AC-CHANGE-001 | App static is network-first | source test and inspection |
| AC-CHANGE-002 | Landing waveform is visible | browser screenshot and computed dimensions |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/service-worker.test.ts src/app/onboarding.test.ts` | targeted regression | yes | exits 0 |
| `npm run verify` | full quality gate | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/` | reload after code change; inspect waveform bars | 28 visible bars with non-zero width and contrasting color |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | stop and ask for explicit confirmation |
| `npm run sync` needed | stop and ask for explicit confirmation |
| `.env*` edit needed | stop and ask user to edit |
| Fix requires unrelated refactor | stop and split scope |

## Rollback

| Area | Rollback |
|---|---|
| Code | restore only the service-worker policy and remove the focused test |
| Data | N/A; no data writes allowed |
| Deploy | redeploy the prior static worker if this policy must be reversed |
