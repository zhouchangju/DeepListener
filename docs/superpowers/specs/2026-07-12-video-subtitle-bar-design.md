# Video Subtitle Bar Design

## Status

- Date: 2026-07-12
- State: approved design, awaiting implementation plan
- Scope: video Practice UI only

## Goal

Add an optional, sentence-aligned subtitle bar immediately below the video in the Practice workbench. The feature remains a listening aid rather than a course-note or content-management feature.

## User Experience

- Only video Tracks expose the subtitle control.
- Every Practice page visit starts with subtitles hidden.
- The choice is not persisted in localStorage or the database.
- When hidden, a compact `Show subtitles` control remains available without reserving a large empty subtitle area.
- When enabled, the current sentence appears between the video and the existing player controls.
- The subtitle bar is outside the video frame, so it does not cover slides, code, diagrams, films, or other visual content.
- The subtitle bar displays at most two centered lines. Long text wraps and clips rather than expanding the workbench indefinitely.
- Text is rendered with high contrast, a translucent dark background, and a light text shadow.
- Clicking subtitle text has no seek or editing behavior.
- Audio-only Tracks, Shadowing, Vault, and Review do not render this control or subtitle bar.

## Timing Semantics

The video element remains the single playback clock. The subtitle bar consumes the same time updates already used by waveform and sentence-list synchronization.

For playback time `t`, a sentence is active when:

```text
sentence.startTime <= t <= sentence.endTime
```

Boundary rules:

- At a shared boundary, prefer the later sentence whose `startTime` equals the current time.
- During a genuine gap between sentences, render no subtitle.
- Do not retain the previous sentence during a gap.
- If source segments overlap, use the same normalized sentence timings already produced by `AudioPlayer` before matching.
- Seeking, clicking a sentence, playback-rate changes, native video controls, WaveSurfer interactions, and region loops all update the subtitle through the shared playback clock.

## Component Design

### `getActiveSubtitle`

A pure helper takes normalized sentences and current playback time, then returns the active sentence text or `null`. It owns the exact boundary and gap behavior and is covered by focused unit tests.

### `VideoSubtitleBar`

A video-only presentational component owns:

- the show/hide control;
- the visible subtitle surface;
- accessible labels for both states;
- the two-line high-contrast presentation.

It receives the active subtitle as data and does not read or control media directly.

### `AudioPlayer`

`AudioPlayer` continues to own normalized sentences and the shared time-update callback. It adds:

- local `subtitlesVisible` state initialized to `false`;
- local active-subtitle state or a time-derived update;
- `VideoSubtitleBar` only when `videoUrl` exists.

No Prisma, API, upload, transcription, Vault, Review, or Shadowing changes are required.

## Accessibility

- The toggle exposes an explicit `Show subtitles` or `Hide subtitles` accessible name.
- The visible subtitle surface uses `aria-live="off"`; continuously announcing every sentence would disrupt screen-reader users.
- Subtitle text meets high-contrast readability expectations in light and dark themes.
- The control is keyboard reachable and uses the existing shared Button primitive.

## Error And Empty States

- A video Track with zero sentences can still show the toggle, but enabling it renders a quiet `No subtitle at this position` state only if needed for clarity; the preferred implementation is an empty subtitle surface without an error toast.
- A time value outside the media duration returns no subtitle.
- Missing or malformed timing data must not throw during rendering.

## Testing

Focused tests must cover:

- subtitles hidden by default;
- subtitle UI rendered only for video Tracks;
- show/hide accessible labels;
- exact start and end boundaries;
- preference for the later sentence at a shared boundary;
- gaps returning no subtitle;
- overlapping source sentences using normalized timing;
- `AudioPlayer` forwarding the shared playback time to subtitle matching;
- no database or persistence mechanism introduced.

Run the project gates after implementation:

```bash
npm run lint
npm run build
node --import tsx --test <subtitle and player test paths>
npm run test:ci
```

## Non-Goals

- No word-level or karaoke highlighting.
- No simultaneous previous/next sentence context.
- No subtitle editing in the bar.
- No font, color, size, opacity, position, or language settings in v1.
- No subtitle preference persistence.
- No captions in fullscreen native video mode in v1, because the subtitle bar intentionally sits outside the video frame.
- No changes to course concepts, notes, review scheduling, or exports.

## Reference Behavior

YouTube exposes an explicit captions toggle and configurable font, color, opacity, size, background, window, and edge settings. This design adopts the durable core behaviors—an explicit toggle and high-contrast readable treatment—without importing a complex caption-settings panel into a focused listening tool.

Reference: <https://support.google.com/youtube/answer/100078?hl=en>
