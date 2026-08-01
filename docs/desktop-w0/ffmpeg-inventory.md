# T020 — FFmpeg / ffprobe Operations & Codec Inventory

| Field | Value |
|---|---|
| Sprint | SPR-001 (W0 Desktop Feasibility, Adversarial) |
| Lane | W0-B (FFmpeg & media assets) |
| Task | T020 — Inventory required FFmpeg/ffprobe operations and codecs |
| Req | FR-041, FR-046, FR-047, DMR-001, DMR-002 |
| Baseline commit | `960ec85` |
| Date | 2026-07-22 |
| Scope | Documentation only. No source edits, no binaries, no dependency changes. |

## 1. Purpose

Map **every** current FFmpeg/ffprobe invocation in the DeepListener codebase to (a) the
operation it performs, (b) the codecs/containers it depends on, and (c) the fixture each
operation needs for a packaged-path spike (T022). This inventory is the authoritative input
for:

- T021 (provenance: which enabled codecs a redistributable binary must provide), and
- T022 (the explicit packaged-path spike contract), and
- T023 (the `capabilities` field of the runtime asset manifest).

## 2. Search Method

Grepped `src/lib` and `src/app/api` for `ffmpeg`, `ffprobe`, and `fluent-ffmpeg`
(case-insensitive), excluding `node_modules` and `.test.` files for call-site discovery.
Test files are listed separately because they do not represent runtime behavior but do
document the failure surface. All access to the media tools flows through one library
(`fluent-ffmpeg`); there is no direct `child_process` spawn of `ffmpeg`/`ffprobe` in
application code today (the only `execFile` use is `hasCommand` in readiness, which probes
PATH presence, not media).

Files containing FFmpeg/ffprobe references:

- `src/lib/media-processing.ts`
- `src/lib/upload-error.ts` (+ `src/lib/upload-error.test.ts`)
- `src/lib/setup-readiness.ts` (+ `src/lib/setup-readiness.test.ts`)
- `src/app/api/library/export/route.ts`
- `src/app/api/audio/export/route.ts`
- `src/app/api/audio/export/query.ts` (filter spec only)

## 3. Call-Site Inventory

The fluent-ffmpeg library is imported as `import ffmpeg from "fluent-ffmpeg"` in three files.
`ffmpeg(...)` constructs a transcoding chain; `ffmpeg.ffprobe(...)` performs metadata
inspection. fluent-ffmpeg itself resolves `ffmpeg` and `ffprobe` from PATH unless the
application explicitly calls `ffmpeg.setFfmpegPath(...)` / `ffmpeg.setFfprobePath(...)`.
**No such `set*Path` call exists today** — confirming the FR-041 gap: every operation
currently relies on PATH discovery and must be converted to explicit packaged paths in
Desktop (see T022 contract).

| # | Call site (file:line) | API | Operation | Invoked from | Required codecs / containers / filters |
|---|---|---|---|---|---|
| 1 | `src/lib/media-processing.ts:11` (`extractAudioFromVideo`) | `ffmpeg(videoPath).noVideo().audioCodec("libmp3lame").audioBitrate("192k").save(audioPath)` | **Audio extraction** (video → MP3) | video import: `src/app/api/upload/route.ts:86` | demux MP4/WebM; decode H.264/AAC (and any user audio codec in source); **encode MP3 via `libmp3lame` @ 192k**; mux MP3 |
| 2 | `src/lib/media-processing.ts:23` (`hasSubtitleStream`) | `ffmpeg.ffprobe(videoPath, …)` reading `metadata.streams[].codec_type === "subtitle"` | **Probe** (subtitle presence detection) | video import: `readEmbeddedSubtitles` at `media-processing.ts:30` (→ `upload/route.ts:94`) | demux MP4/WebM; metadata parsing; **no decode** required |
| 3 | `src/lib/media-processing.ts:35` (`readEmbeddedSubtitles`) | `ffmpeg(videoPath).outputOptions(["-map 0:s:0","-f srt"]).save(subtitlePath)` then `parseSrt(...)` | **Subtitle extraction** (first subtitle stream → SRT) | video import: `upload/route.ts:94` | demux MP4/WebM; **decode `mov_text`/`subrip`/`srt` subtitle**; **mux/remux SRT** (`-f srt`) |
| 4 | `src/app/api/audio/export/route.ts:213` (segment loop) | `ffmpeg(seg.audioPath).setStartTime().setDuration().audioFilters([aresample=44100]).audioBitrate("192k").save(seg.mp3)` | **MP3 segment export** (per-sentence trim + resample) | audio export POST | demux/decode any supported source audio; **`aresample` filter (44100)**; encode MP3 (`libmp3lame`) @ 192k |
| 5 | `src/app/api/audio/export/route.ts:257` (silence gen) | `ffmpeg(segmentFiles[0]).audioFilters([volume=0, aresample=44100]).setDuration(2.0).audioBitrate("192k").save(silence.mp3)` | **Silence generation** (2 s gap between sentences) | audio export POST | `volume` + `aresample` filters; encode MP3 (`libmp3lame`) @ 192k |
| 6 | `src/app/api/audio/export/route.ts:293` (merge) | `ffmpeg().input(concat.txt).inputOptions(["-f concat","-safe 0"]).audioBitrate("192k").save(output.mp3)` | **Concat** (concat demuxer merge of MP3 parts) | audio export POST | **`concat` demuxer** (`-f concat`, `-safe 0`); MP3 stream-copy/remux |
| 7 | `src/app/api/library/export/route.ts:112` (track re-encode) | `ffmpeg(track.audioPath).audioBitrate("192k").save(track.mp3)` | **MP3 re-encode** (normalize track to MP3 192k) | library export POST | demux/decode any supported source audio; encode MP3 (`libmp3lame`) @ 192k |
| 8 | `src/app/api/library/export/route.ts:138` (silence gen) | same pattern as #5 | **Silence generation** | library export POST | same as #5 |
| 9 | `src/app/api/library/export/route.ts:159` (merge) | same pattern as #6 | **Concat** | library export POST | same as #6 |

Readiness / error-classification references (not media operations, listed for completeness):

| # | Call site (file:line) | API | Purpose | Production-path impact |
|---|---|---|---|---|
| R1 | `src/lib/setup-readiness.ts:124-125` | `dependencies.hasCommand("ffmpeg")` / `hasCommand("ffprobe")` (execFile `-version`) | Readiness check: are `ffmpeg`/`ffprobe` on PATH? | **Desktop must change**: `hasCommand` checks PATH, which is exactly what FR-041 forbids. Desktop readiness must verify the **packaged path + checksum**, not PATH. |
| E1 | `src/lib/upload-error.ts:18` | regex on error message (`/ffmpeg\|ffprobe\|Cannot find ffmpeg\|ENOENT/i`) | Map missing-binary failures to a 503 public error | Still valid signal; Desktop should keep surfacing 503 when the packaged binary is missing/invalid. |

### 3.1 Source formats accepted by import (`src/lib/upload-policy.ts`)

The import pipeline only accepts these file extensions/MIMEs, which bound the **decode**
codec set a packaged binary must cover:

- **Audio**: `.aac .aif .aiff .flac .m4a .mp3 .mpeg .oga .ogg .opus .wav` (or any `audio/*` MIME)
- **Video**: `.mp4 .webm` (MIME `video/mp4`, `video/webm`)

So the realistic decode surface is: AAC, ALAC/PCM/AIFF, FLAC, M4A/MP4 audio, MP3, MPEG audio,
Vorbis, Opus, WAV/PCM, plus MP4 (H.264/AAC) and WebM (VP8/VP9/Opus/Vorbis) containers.

## 4. Operation → Codec → Fixture Matrix

Consolidating the 9 media call sites into 6 distinct operations, with the exact fixture each
operation needs in the T022 packaged-path spike. Fixtures are owned by lane W0-E / task T002
(`tests/fixtures/desktop/**`); this inventory references them, it does **not** create them.

| Operation | Call sites | Required capability (encode) | Required capability (decode) | Filters / format | Fixture needed (T002) |
|---|---|---|---|---|---|
| **Probe** (subtitle presence) | #2 | — | metadata/demux MP4, WebM | `ffprobe` JSON stream scan | tiny MP4 **without** subtitles (assert no subtitle); tiny MP4 **with** one `mov_text` subtitle (assert subtitle detected) |
| **Audio extraction** | #1 | MP3 (`libmp3lame`) @ 192k | MP4/WebM: H.264 + AAC | `-vn`, `-c:a libmp3lame -b:a 192k` | tiny MP4 (H.264/AAC, ~2 s) → expect MP3 output |
| **Subtitle extraction** | #3 | SRT (`-f srt`) | `mov_text` / `subrip` | `-map 0:s:0 -f srt` | tiny MP4 with embedded `mov_text` SRT → expect parseable SRT (round-trips through `parseSrt`) |
| **MP3 segment export** (+ resample) | #4, #7 | MP3 (`libmp3lame`) @ 192k | any accepted audio | `-ss`/`-t`, `-af aresample=44100` | tiny source MP3 + (start,end) pair → expect MP3 segment of correct duration |
| **Silence generation** | #5, #8 | MP3 (`libmp3lame`) @ 192k | (any source for metadata) | `-af volume=0,aresample=44100`, `-t 2.0` | reuse segment fixture; expect ~2 s silent MP3 |
| **Concat** | #6, #9 | (stream copy / MP3) | MP3 | `-f concat -safe 0` | two tiny MP3s + concat list → expect merged MP3 (durations sum) |

## 5. Codec Gaps / Risk Notes for a Redistributable Binary

These are the load-bearing capability requirements a candidate binary must satisfy; gaps
here would directly break DeepListener's actual usage. (Full per-candidate analysis is in
T021 `ffmpeg-provenance.md`; this section only enumerates the required set.)

1. **`libmp3lame` (MP3 encode) is mandatory and load-bearing.** FFmpeg has no built-in MP3
   encoder; call sites #1, #4, #5, #7, #8 all rely on it. Any candidate that omits
   `libmp3lame` breaks audio extraction AND every export path. (LAME is itself LGPL, so an
   LGPL build can still include it — see T021.)
2. **`aresample` and `volume` audio filters are mandatory** (call sites #4, #5, #7, #8).
   These are core LGPL filters, present in all builds; flagged only for completeness.
3. **`concat` demuxer (`-f concat`) is mandatory** (call sites #6, #9). Core protocol,
   present in all builds.
4. **Subtitle decode (`mov_text`/`subrip`) + SRT mux (`-f srt`) mandatory** (call site #3),
   because FR-046 prefers embedded subtitles before provider transcription. Core LGPL.
5. **H.264 / AAC decode for MP4 and VP8/VP9 + Opus/Vorbis for WebM** are the realistic
   video decode surfaces. H.264 decode is native (LGPL) in FFmpeg; no GPL codec is required
   for **decode**. Encode of H.264 (`libx264`) is **not** used anywhere in the codebase —
   DeepListener never encodes video, only extracts audio and subtitles. This is the key
   fact that makes a pure LGPL binary sufficient (see T021).
6. **`libx264`/`libx265` are NOT required** by any call site. Their absence in an LGPL
   build is a non-issue for DeepListener.

## 6. Verify Clause (AC-T020)

> **Every current FFmpeg call site maps to a required operation and fixture.**

| Check | Result |
|---|---|
| All runtime call sites enumerated | ✅ 9 media call sites (#1–#9) + 1 readiness check (R1) + 1 error classifier (E1) |
| Each media call site → operation | ✅ mapped in §3 and consolidated in §4 (probe / audio extraction / subtitle extraction / MP3 export / silence / concat) |
| Each operation → required codec/container/filter | ✅ §4 |
| Each operation → fixture need | ✅ §4 (owned by T002, referenced not created) |
| No `setFfmpegPath`/`setFfprobePath` exists today | ✅ confirms PATH-discovery gap that FR-041 / DMR-002 must close |
| Decode surface bounded by `upload-policy.ts` extension set | ✅ §3.1 |

## 7. Inputs to Downstream Tasks

- **T021** — the mandatory-capability set above (especially "libmp3lame mandatory,
  libx264/libx265 not used") is the gate a candidate binary must clear.
- **T022** — the six operations in §4 are exactly the six commands the packaged-path
  spike must validate; fixtures are listed per operation.
- **T023** — the `capabilities` field of the manifest must at minimum encode:
  `codecs: ["libmp3lame"]` (encode) and `filters: ["aresample","volume","concat"]` and
  `subtitleFormats: ["mov_text","subrip","srt"]` and `containers: ["mp4","webm","mp3"]`.
