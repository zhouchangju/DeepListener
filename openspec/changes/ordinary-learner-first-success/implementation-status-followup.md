# Implementation status follow-up — 2026-08-05

This addendum records the latest locally verifiable usability work. It does not close the external HG-01 through HG-04 gates or OFS-010.

## Completed in this follow-up

- Provider decision-card hash navigation opens the real configuration dialog in one action. The fix uses a native anchor because Next.js `pushState` does not emit `hashchange`.
- Subtitle import copy now explains the two paths before file selection: a local SRT/VTT avoids Provider setup; media-only import still uses the configured Provider.
- Practice blind-mode toggle now has a visible label at normal desktop widths and `aria-pressed`; the compact icon-only layout remains for small screens.
- Fresh Desktop profiles no longer show a false media-storage blocker when only the `media` child directories are absent but their nearest ancestor is writable; readiness remains read-only.
- Import retry elapsed seconds are visual-only while assistive technology receives a single retry announcement, avoiding one announcement per second.
- Single-file import now says “Choose a file” / “选择文件”; batch import keeps “Choose from folder” / “从文件夹选择”, matching the actual picker behavior.
- When no provider is configured, the subtitle wizard now explains the SRT/VTT and embedded-video-subtitle alternatives and links directly to Provider setup before a provider-dependent import starts.
- Chinese Demo Practice now renders a localized offline-demo heading instead of exposing the English seed title; normal user-created track titles remain unchanged.

## Evidence

- Targeted tests: `src/app/setup/ProviderCardActions.test.ts`, `src/app/setup/page.structure.test.ts`, `src/app/library/ImportMediaWizard.test.ts`, `src/app/library/UploadButton.test.ts`, `src/app/library/UploadDropDialog.test.ts`, `src/app/practice/PracticeClient.structure.test.ts`.
- Full `npm run test:ci`: 474 tests, 472 passed, 2 Windows capability skips, 0 failures.
- `npm run lint`: passed.
- `npm run build`: passed; one existing non-blocking Turbopack NFT tracing warning remains.
- Isolated Desktop first-use browser smoke: the disposable Desktop data root initialized on startup and `/` → Demo reached Practice; the visible Chinese Demo heading is localized.
- Browser evidence and limitations: `docs/agent-harness/sessions/2026-08-05-product-audit/audit-notes.md`.

## Still open

Real Demo provenance/audio approval, real Provider and FFmpeg E2E, clean-install/package validation on target OSes, manual 200% zoom/screen-reader/reduced-motion acceptance, and observation with at least five non-developer English learners remain external gates.

## 2026-08-05 self-check continuation

- Replaced first-session “API key” wording with service-key wording in both locales for the Demo note, landing explanation, decision guide, subtitle import, upload failure recovery, and retry-provider selector. The explicit Provider form still names the credential as an API key where the user is actually asked to paste one.
- Added a two-locale terminology audit covering the learner-facing onboarding, landing, Demo, import, and recovery paths; implementation-only terms remain confined to Setup recovery details.
- Added an accessibility contract suite for Demo, Practice, Setup, Provider configuration, subtitle import, and import recovery. The checks lock labelled live regions, `aria-pressed` state, progressive disclosure, recovery destinations, and write-only credential handling.
- Added the T120 release contract: public preflight is executed against a disposable target and must reject the current synthetic Demo fixture plus missing target-specific FFmpeg assets.
- Verification: targeted first-session suite 18/18; T120 targeted suite 4/4; `npm run lint`; `npm run test:ci` 483 total / 481 passed / 2 Windows skips / 0 failures; `npm run build`; `git diff --check`.

## 2026-08-05 quality-gate correction

- The post-copy-fix full run was re-executed rather than inferred from the prior baseline: `npm run lint`, `npm run build`, the 13-test first-session targeted suite, and `npm run test:ci` all passed.
- The current full-suite evidence is 483 tests, 481 passed, 2 Windows capability skips, and 0 failures. The two skips remain environment-limited POSIX mode-bit/symlink checks; no product test is skipped.

## 2026-08-05 import dead-end prevention

- The subtitle wizard now disables the start action for an audio-only file when no Provider is configured and no sidecar subtitle is attached. The same state keeps video imports available because embedded subtitles can still satisfy the local path.
- The warning is localized in both locales and tells the learner exactly how to unblock the audio path: attach SRT/VTT or open Provider setup.
- Verification: `ImportMediaWizard.test.ts` 7/7, `npm run lint`, `npm run build`, `npm run test:ci` 484 total / 482 passed / 2 Windows skips / 0 failures, and `git diff --check`.

## 2026-08-05 subtitle/media duration validation (T141)

- Added the pure `src/lib/subtitle-media-validation.ts` contract and four focused tests. It blocks empty, negative, reversed, and materially overlapping cues; treats an unavailable media duration as advisory; and applies a minimum-two-second or ten-percent duration tolerance before blocking a materially out-of-range subtitle.
- `validateSubtitleMatch()` now delegates to the shared validator while preserving its existing safe reason union for callers.
- The first full verify exposed a TypeScript reason-union mismatch in the adapter; it was fixed with explicit narrowing and the complete gate was rerun.
- Latest full verification: 488 tests, 486 passed, 2 Windows capability skips, 0 failures; lint and build passed. The existing non-blocking Turbopack NFT tracing warning remains.

## 2026-08-05 self-check: blind-mode screen-reader boundary

- The local browser smoke confirmed that Demo starts in visual blind mode: sentence text is blurred while the sentence card remains selectable.
- The adversarial accessibility check found that CSS blur alone still left the sentence text in the accessibility tree. `SentenceList` now applies `aria-hidden={isBlurred}` only to the blurred text container; the card label and sentence actions remain available.
- Targeted tests: `SentenceList.test.ts` and `first-session-accessibility.test.ts`, 6/6 passed. Browser smoke confirmed the initial Demo accessibility snapshot omits the hidden sentence text while the sentence card remains locatable; no console errors or warnings were observed.
- Full `npm run verify`: 495 tests, 493 passed, 2 Windows capability skips, 0 failures; lint and build passed. The existing non-blocking Turbopack NFT tracing warning remains.
- Session evidence: `docs/agent-harness/sessions/2026-08-05-blind-mode-screen-reader/`.

## 2026-08-05 导入错误文案本地化与错误边界

- 对抗式复核发现：单文件、批量、字幕向导和恢复列表在遇到 Provider、媒体、字幕、超时或网络失败时，可能直接把服务端英文错误原文展示给中文学习者；客户端文件预检也返回了英文硬编码提示。
- 新增 `src/lib/import-jobs/recovery-copy.ts` 与 `src/lib/client-upload-validation-copy.ts`，把已知安全错误码/预检码映射到中英文学习者提示；导入恢复、单文件上传、批量上传和字幕向导均不再渲染原始 `error.message`。
- 服务器仍保留安全错误码和诊断消息用于恢复与日志，状态机、重试、换服务商、字幕替换和数据所有权合同未改变。
- 证据：`recovery-copy.test.ts`、`client-upload-validation-copy.test.ts`、`UploadButton.test.ts`、`BatchUploadButton.test.ts`、`ImportMediaWizard.test.ts`、`ImportRecoveryList.test.ts`、`first-session-language.test.ts`；定向套件 33/33，通过 `npm run lint`、`npm run build`、`npm run test:ci`（500/498/2/0）和浏览器 `/library?import=subtitle` smoke（无控制台错误）。
- Contract 证据：`docs/agent-harness/sessions/2026-08-05-import-error-copy/`。该项改善语言与信任边界，不关闭真实 Provider/FFmpeg、跨平台发行或目标用户闸门。

## 2026-08-05 latest verification correction

The batch-upload preflight follow-up ran the complete gate again after the
earlier historical entries: `npm run verify` now reports 503 tests, 501 passed,
2 Windows capability skips, and 0 failures; lint and build pass. The batch
evaluator also contains browser evidence for `/library?batch=true`, including
the localized filename-specific rejection before any request is sent. Earlier
counts in this addendum are historical evidence for their respective changes;
the main source of truth is `implementation-status.md`.

## 2026-08-05 review navigation follow-up

- Global navigation now places Review before low-frequency Setup and exposes the
  active route with both visible styling and `aria-current="page"`.
- A read-only `/api/review/count` projection and `NavReviewCount` badge make
  today's due/relearning queue discoverable from every route. The badge is
  localized, hides on zero/unavailable counts, and refreshes after a successful
  grade through the existing global invalidation signal.
- Contract evidence: the four-file targeted command passed 18/18; `npm run
  verify` passed with 513 tests, 511 passed, 2 Windows capability skips, and 0
  failures; lint/build and `git diff --check` passed. Browser smoke confirmed
  `/library` and `/review` active states and the visible Chinese due count, with
  no console errors or warnings.
- This closes the local Review-navigation evidence gap only. HG-01 through
  HG-04, real Provider/FFmpeg E2E, clean-install/package validation, and
  manual accessibility/learner acceptance remain open.

## 2026-08-05 mobile Review badge parity

- The mobile menu now mounts the same optional `NavReviewCount` component as
  desktop navigation, so a learner can discover a nonzero Review queue without
  entering the page first.
- The mobile links also reuse the shared `navLinkClass`, so the current page is
  visibly highlighted in addition to exposing `aria-current`.
- AppShell + NavReviewCount targeted tests pass 9/9. A 390×844 browser smoke
  confirmed the menu item `复习 复习，1 条待复习`; the viewport was reset after
  the check. Full `npm run verify` passes with 513 tests, 511 passed, 2 Windows
  capability skips, and 0 failures.
- This is a local discoverability improvement only; external release, real
  Provider/FFmpeg, Demo provenance, and manual learner/accessibility gates stay
  open.

## 2026-08-05 landing Demo loading status

- The landing-page Demo CTA now exposes `aria-busy` while the local Demo
  preparation request is running and emits one localized polite live-region
  status. The existing request, readiness redirect, and error behavior are
  unchanged.
- Targeted page/accessibility tests pass 8/8. The full gate passes with 514
  tests, 512 passed, 2 Windows capability skips, and 0 failures; lint/build and
  `git diff --check` pass.
- This improves local first-session accessibility only; Demo provenance,
  release-platform, real Provider/FFmpeg, and target-learner gates remain open.

## 2026-08-05 Server/self-hosted edition label

- Landing copy now explicitly calls the Server/self-hosted path a technical
  operator path in both locales. This clarifies the boundary without claiming
  that a signed Desktop release is available.
- `page.first-success.test.ts` passes 4/4 for the landing contracts; the full
  gate passes with 515 tests, 513 passed, 2 Windows capability skips, and 0
  failures. Lint/build and `git diff --check` pass.

## 2026-08-05 Demo title localization follow-up

- 对抗式 UX 复核发现：中文资料库的字幕导入弹窗已经本地化，但内置 Demo 卡片仍显示英文标题 `DeepListener Demo — Blind Listening`，造成语言切换不完整。
- `LibraryContent` 现在只对 `trackType === "DEMO"` 投影独立的 `displayTitle`，使用 `library.demoTrackTitle`；数据库中的 Demo 原始标题、个人素材标题和 Demo 所有权标记均不变，重命名流程仍使用原始 `title`。
- 中文浏览器 smoke 在 `/library?import=subtitle` 确认卡片显示“离线 Demo：盲听练习”，字幕导入弹窗仍正常打开；未触发上传或写入数据。
- 证据：`src/app/library/demo-title.test.ts`、`src/app/library/TrackList.accessibility.test.ts` 与 `src/i18n/first-session-language.test.ts` 定向 9/9；最新 `npm run verify` 为 516 个测试，514 通过、2 个 Windows 能力跳过、0 失败，lint/build 通过。证据目录：`docs/agent-harness/sessions/2026-08-05-demo-title-localization/`。
- 该修复只关闭本地显示层语言缺口；真实 Demo provenance、Provider/FFmpeg、跨平台发行和目标用户人工闸门仍保持开放。
