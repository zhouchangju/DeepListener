# 2026-08-05 Product audit: ordinary learner first success

## Scope and evidence

This audit used the local Codex in-app browser at a 1280x720 viewport. Screenshots were captured from the visible page, saved locally, and inspected before acceptance.

- `01-setup-viewport.png` — Setup readiness and decision guide.
- `02-provider-dialog.png` — Provider configuration opened from `/setup#provider-settings` after the deep-link fix.
- `03-subtitle-import.png` — Subtitle import wizard in a disposable Desktop data root.
- `04-demo-practice.png` — Offline Demo initial practice screen.
- `05-demo-playing.png` — Demo after the first play action.
- `06-demo-transcript.png` — Transcript revealed.
- `07-favorite-dialog.png` — Favorite-reason dialog.
- `08-demo-saved-status.png` — Saved status with Library/Review handoff links.
- `09-review.png` — Review queue before revealing the answer.
- `10-review-answer.png` — Review answer revealed.
- `11-review-complete.png` — Empty review queue after rating.

## Step findings

1. **Setup readiness — healthy.** The page leads with a plain-language promise, separates “no API key” paths from Provider setup, and exposes executable destinations. The main remaining friction is that several checks are still technical beneath progressive disclosure; this is acceptable for recovery but should remain secondary for learners.
2. **Provider deep link — fixed and healthy.** The original Next `Link` updated the hash through `pushState`, so the `hashchange` listener did not open the dialog. The decision-guide Provider action now uses a native anchor, so `/setup#provider-settings` opens the real dialog in one action. The dialog has a labelled title, localized close button, focus inside the dialog, and Escape dismissal. No key was entered and no Provider request was sent.
3. **Subtitle import — healthy.** The dialog states “不需要转写服务商 API 密钥” before file selection. The two file actions are visually distinct, the primary action is disabled until media is chosen, and the dialog receives focus. The visible copy still says the subtitle is optional even though the route is specifically for paired media+subtitle import; consider clarifying that a subtitle is optional only when the user wants local media-only processing.
4. **Demo first practice — healthy with a localization polish item.** The five-step checklist makes the intended loop visible and progress updates are exposed in a live region. The page mixes a learner-facing Chinese checklist with the English product title and a few icon-only controls; accessible names exist, but a novice may still benefit from short visible labels for the top-right “跟读” and reveal controls.
5. **Favorite reason — healthy.** The reason dialog gives concrete choices and a clear final action. Focus remains in the modal and the selected sentence is quoted, which reduces context loss.
6. **Review handoff — healthy.** The saved state offers explicit “在收藏库查看本素材” and “开始复习” links. Review exposes the answer toggle and four rating actions with keyboard guidance; completion ends in a clear “没有待复习的句子。干得漂亮！” state.

## Accessibility evidence and limits

- Observed dialog accessible names, focus entry, localized close button, Escape dismissal, `aria-pressed` sentence selection, and status/live-region feedback.
- Screenshots cannot establish full screen-reader reading order, 200% zoom reflow, reduced-motion behavior, or keyboard traversal across every control. Those remain manual acceptance gates.
- The Demo uses the repository’s synthetic/local smoke asset. This is suitable for UI flow evidence only and does not close the real Demo provenance/rights gate.

## Follow-up recommendation

Keep the Provider deep-link fix. Next highest-value learner improvement is to make the subtitle dialog’s optional-vs-required wording explicit and add visible micro-labels to the small top-right Demo actions while preserving the current accessible names.

## Follow-up implementation

- Subtitle dialog copy now states the exact condition: attaching a local SRT/VTT avoids Provider setup; media-only import still uses the configured Provider.
- Practice blind-mode toggle now shows a visible label at normal desktop widths and exposes `aria-pressed`; the icon-only compact layout remains available below the small-screen breakpoint.
- Targeted tests for the subtitle wizard and Practice client pass after the follow-up.
- Browser follow-up evidence: `03-subtitle-import-followup.png` and `04-demo-practice-followup.png` were captured and visually inspected after the copy/control changes.

## 2026-08-05 self-check follow-up

- The first-use browser smoke was repeated in an isolated Desktop data root. Startup initialized the disposable database and the landing Demo CTA reached Practice directly.
- The Chinese Practice page exposed the seeded English title `DeepListener Demo — Blind Listening` even though the surrounding first-session copy was localized. This was a real learner-facing polish gap, not a data or provider failure.
- Practice now renders the localized `practice.demoTrackTitle` only for Demo mode; normal track titles and the persisted seed title remain unchanged for data/export compatibility.
- Accepted screenshots: `03-self-check-landing-viewport.png` and `04-self-check-demo-practice.png`. The latter shows the localized heading `离线 Demo：盲听练习`.

## 2026-08-05 self-check continuation: language and accessibility contracts

- No process hang was found. The local quality gates were green before and after this follow-up.
- First-session no-key copy now says “service key” / “服务密钥” instead of “API key” / “API 密钥” on the Demo note, landing, decision guide, subtitle import, and recovery surfaces. The Provider credential form intentionally keeps “API key” because that is the concrete value the user pastes.
- Added automated contract coverage for Demo live progress, Practice blind-mode state and saved handoff, Setup progressive disclosure and executable destinations, Provider dialog labels/write-only key handling, subtitle-import status, and import-recovery status/recovery links.
- Targeted first-session suite: 18/18 passed. T120 Desktop preflight contract: 4/4 passed. Full `npm run verify`: 482 tests, 480 passed, 2 Windows capability skips, 0 failures; `npm run lint`, `npm run build`, and `git diff --check` passed.
- Manual screen-reader, 200% zoom, reduced-motion, real-provider, real-FFmpeg, clean-install, and target-learner gates remain open; these tests do not claim to close them.

## Quality-gate correction after Provider copy fix

- Re-ran the applicable gates after correcting the configured-key hint: `npm run lint`, `npm run build`, the 13-test first-session targeted suite, `npm run test:ci`, and `git diff --check` all passed.
- Current full-suite result: 483 tests, 481 passed, 2 Windows capability skips, 0 failures. The earlier 482/480 line above is historical evidence from before the latest structure test was collected; it is superseded by this run.

## Import dead-end prevention

- The audit found one concrete novice dead end: an audio-only file could be uploaded without a configured Provider or sidecar subtitle, then fail only at transcription after the upload wait.
- The subtitle wizard now blocks that guaranteed provider-dependent audio start, shows a localized recovery hint, and keeps the video path available for embedded subtitles. Attaching SRT/VTT also clears the block.
- Verification: `ImportMediaWizard.test.ts` 7/7, `npm run lint`, `npm run build`, and full `npm run test:ci` with 484 tests / 482 passed / 2 Windows skips / 0 failures. Manual provider, FFmpeg, target-OS, and learner gates remain open.

## 2026-08-05 self-check and T141 follow-up

- A fresh self-check found no hung process. The first complete verify stopped at a real TypeScript error in the new subtitle/media validator adapter, not at a stalled test runner.
- The adapter now explicitly narrows the shared validator's reason union, preserving the older `validateSubtitleMatch()` contract. Targeted subtitle tests pass 8/8.
- The rerun of `npm run verify` completed successfully: 488 tests, 486 passed, 2 Windows capability skips, 0 failures; lint and production build passed.
- The build continues to report one non-blocking Turbopack NFT tracing warning from the backups route. This is recorded as a warning, not treated as a product-test failure.

## 2026-08-05 Demo cleanup affordance

- The audit found that Demo deletion was safe at the API/service layer but had no learner-facing entry point after the first session.
- Setup data safety now checks `GET /api/demo` and, only when the Demo exists, exposes a localized “Remove Demo content” action with explicit confirmation. It calls the existing scoped `DELETE /api/demo`; personal data is not handled by the UI.
- Focused evidence: `DataSafetyActions.test.ts`, `demo/route.structure.test.ts`, and `demo-seed.test.ts` passed 9/9; lint passed. Full verify is the remaining local gate for this follow-up.

## 2026-08-05 embedded-subtitle copy correction

- A second adversarial pass found that the Setup decision card said “audio or
  video with embedded subtitles,” while the implemented no-Provider path only
  supports embedded captions on video. Audio without a sidecar must use SRT/VTT
  or a configured Provider.
- The English and Chinese copy now states that distinction explicitly. The
  import routes and Provider behavior were not changed.
- Evidence: `src/i18n/first-session-language.test.ts` 7/7 and `npm run verify`
  with 492 tests / 490 passed / 2 Windows capability skips / 0 failures.

## 2026-08-05 generic import dead-end prevention

- The same first-principles check found that the generic single-file and batch
  import buttons could still upload audio after the no-provider warning; the
  failure would only appear during transcription. This was inconsistent with
  the earlier subtitle-wizard guard.
- Both entrypoints now stop audio before creating an upload request when the
  server confirms that no Provider is configured. Video remains allowed because
  embedded captions may satisfy the local path, and unknown/configured Provider
  states preserve the existing flow.
- Evidence: focused upload/import/language tests 31/31 and `npm run verify`
  with 494 tests / 492 passed / 2 Windows capability skips / 0 failures.

## 2026-08-05 subtitle content preflight

- The subtitle wizard previously checked only `.srt`/`.vtt` extensions. Empty
  or malformed content could still upload the media before the server rejected
  the sidecar.
- The wizard now parses and validates the selected subtitle locally before the
  first import-job request. The server keeps the final validation authority;
  valid imports and recovery semantics are unchanged.
- Evidence: focused subtitle/parser tests 16/16 and `npm run verify` with 495
  tests / 493 passed / 2 Windows capability skips / 0 failures.
