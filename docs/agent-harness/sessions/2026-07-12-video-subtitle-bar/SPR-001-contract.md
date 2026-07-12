# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-07-12-video-subtitle-bar |
| Domain | Video practice UI |
| Owner | AI Agent |
| Date | 2026-07-12 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Optional current-sentence subtitle bar | `AudioPlayer`, `video-subtitles/**`, `/practice/[id]` | Video-only, default off, synchronized to shared playback, explicit toggle |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Subtitle import/editing and translation | Existing sentence data is the sole source |
| OOS-002 | Fullscreen overlay and style settings | External compact bar is the accepted first version |
| OOS-003 | Persisting the toggle | Each page entry must default to hidden |

## Acceptance

| ID | Requirement | Evidence |
|---|---|---|
| AC-CHANGE-001 | Toggle appears only for video and starts hidden | component/structure tests and browser check |
| AC-CHANGE-002 | Current sentence follows video/audio seeks and playback | helper tests and browser check |
| AC-CHANGE-003 | Gaps render blank and shared boundaries prefer the later sentence | helper tests |
| AC-PRESERVE-001 | Existing shared-media playback and audio workflows remain intact | targeted and full tests, build |

## Required Verification

Targeted Node tests, `npm run test:ci`, `npm run lint`, `npm run build`, and one browser check against a local video Track.

## Rollback

Revert the code/docs commits. No data or deployment rollback applies.

