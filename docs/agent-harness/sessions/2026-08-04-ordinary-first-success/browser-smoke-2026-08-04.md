# Browser smoke evidence (2026-08-04)

This is a local browser smoke check, not a release or human usability sign-off.

## Environment

- Local development server: `http://127.0.0.1:3100`
- Browser surface: Codex in-app browser
- Locale: Chinese (`zh-CN`)
- Narrow viewport check: `640x900` (a proxy for reflow pressure, not a substitute for real 200% zoom)
- Data safety: no media, provider key, database migration, backup restore, or external request was initiated by the check

## Observed paths

| Path | Observation | Result |
|---|---|---|
| `/` | First screen exposes distinct `试用演示`, `检查运行环境`, and `打开资料库` actions; the copy explains that Demo does not need a key or media import. | Pass |
| `/setup` | Readiness page presents learner-facing status before technical details; details use native disclosure controls. | Pass |
| `/setup` (fresh onboarding state) | Setup stays on its readiness-first page instead of being covered by the global tour; the navigation `引导` button remains the explicit replay path. | Pass |
| `/` (fresh onboarding state) | Onboarding guide renders as a labelled modal dialog with `aria-modal`, description, progress state, focus inside the dialog, and focus return to the guide trigger after skip. | Pass |
| `/setup` at `640x900` | Desktop links collapse behind a menu trigger; the DOM trigger retains `aria-label="菜单"` and the menu remains reachable. | Pass; accessibility-tree naming should still receive manual screen-reader confirmation |
| `/setup#provider-settings` | Deep link resolves to the provider readiness card and automatically opens the labelled Provider configuration dialog. | Pass |
| `/library?import=subtitle` with the local database unavailable | The route returns the bounded learner-facing `学习区域暂时不可用` state and a link back to Setup, rather than exposing a generic server error. | Pass |

## Remaining manual gates

- Real 200% browser zoom without horizontal or two-dimensional scrolling.
- Screen-reader announcements for the menu, onboarding step changes, and asynchronous import states.
- `prefers-reduced-motion` behavior in a real browser profile.
- Demo → Practice → Review completion with the approved real English Demo asset.
- Observation with at least five non-developer English learners (HG-04).

## Follow-up smoke (2026-08-05)

- Local development server: `http://localhost:3000`
- `/setup#provider-settings` opened the Provider dialog directly. In the Chinese locale, the dialog close control resolved to the accessible name `关闭`; no button named `Close` remained. This caught a localization gap that source/structure tests did not cover.
- The fix is implemented through the `closeLabel` prop on `DialogContent`, with first-success dialogs passing `common.close`. This is browser evidence only and does not close the manual screen-reader gate.

## Isolated writable-profile journey (2026-08-05)

- Server: `http://localhost:3101` with a disposable `DEEPLISTENER_DATA_DIR`; no repository database or media was used.
- `/?demo=1` seeded the demo and navigated to `/practice/demo-listening-001?demo=1` without opening the automatic onboarding dialog. The browser completed listen, reveal/select, capture, and review-handoff states; the journey panel reported all five steps complete.
- The same Demo page in `zh-CN` exposed localized player labels (`播放`, `位置`, `循环`, `清除`, and localized waveform/keyboard hints) with no English transport labels.
- `/library?import=subtitle` opened exactly one subtitle-import dialog; the automatic onboarding dialog did not compete for focus. The dialog stated that a Provider API key is not required.
- The disposable profile was stopped and remains outside the repository. These observations are local smoke evidence, not clean-install, screen-reader, or learner-participant sign-off.
