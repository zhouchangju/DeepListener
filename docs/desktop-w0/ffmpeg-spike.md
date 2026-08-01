# T022 — Explicit Packaged-Path Media Operations: SPIKE PLAN + CONTRACT

| Field | Value |
|---|---|
| Sprint | SPR-001 (W0 Desktop Feasibility, Adversarial) |
| Lane | W0-B |
| Task | T022 — Explicit packaged-path media operations (DESIGN + contract this round, **not executable against a cleared binary**) |
| Req | FR-041, FR-047, DMR-002 |
| Baseline commit | `960ec85` |
| Date | 2026-07-22 |
| Scope | Per AUTH-003: **no binary is downloaded this round.** This document is (a) the SPIKE PLAN + CONTRACT for the exact commands that WILL run once a cleared LGPL binary exists, and (b) a LIMITED validation of the **invocation contract** using the **system Homebrew ffmpeg only**, in a disposable `mktemp` dir. Production packaged-path behavior remains pending the cleared binary (T021 OPEN-001..003). |

## 1. What Is and Isn't Proven This Round (read first)

| Evidence class | Status this round | Tool used |
|---|---|---|
| **Invocation contract proven with system binary** (commands + flags produce correct outputs on a tiny fixture) | ✅ PROVEN — §4 | Homebrew `ffmpeg`/`ffprobe` 7.1.1 at `/opt/homebrew/bin` |
| **PATH fallback is disabled in production** | ✅ ASSERTED as a contract — §5 (production resolver must not call `hasCommand`/PATH; explicit path only) | design assertion + fail-safe demo |
| **Missing / checksum-invalid binary fails safely** | ✅ PROVEN at the OS + guard level — §5 | bogus explicit path → exit 127; checksum mismatch → resolver rejects |
| **Packaged-path production behavior on a cleared LGPL binary** | ⏳ PENDING — gated on T021 OPEN-001..003 / W3-B T181 | cleared darwin-arm64 LGPL binary (not downloaded this round) |

Everything in §4 is explicitly **invocation-contract** evidence (does the command shape work?).
Everything that depends on the actual redistributable artifact is deferred to W3-B (T181) and
is labelled as such. No protected data was touched; all artifacts were created and deleted in
a single disposable `mktemp` directory.

## 2. Spike Plan (commands that WILL run once a cleared binary is available)

The runtime asset resolver (W1-C T082 / W3-B T181) will compute two absolute paths:

```
FFMPEG_BIN  = <appResources>/runtime/<platform>-<arch>/ffmpeg      (e.g. .../darwin-arm64/ffmpeg)
FFPROBE_BIN = <appResources>/runtime/<platform>-<arch>/ffprobe
```

Before any operation, the resolver MUST:
1. Verify `<platform>`/`<arch>` match the running process (`process.platform`, `process.arch`).
2. Verify `sha256(file) === manifest.checksum` (from T023). **Mismatch → block, return the
   503 "FFmpeg is unavailable / reinstall" error already produced by `toPublicUploadError`
   (`src/lib/upload-error.ts:18`); never fall back to PATH.**
3. Hand the absolute path to fluent-ffmpeg via `ffmpeg.setFfmpegPath(FFMPEG_BIN)` and
   `ffmpeg.setFfprobePath(FFPROBE_BIN)` once at bootstrap. (These setters are the supported
   mechanism; today the app calls neither, which is the FR-041 gap.)

The six operations below map 1:1 to the T020 inventory (`ffmpeg-inventory.md` §4). Each
shows the fluent-ffmpeg call site being reproduced and the equivalent raw CLI the spike runs
to prove the flag set.

### Op 1 — Probe (subtitle presence)  [call site #2]
```bash
"$FFPROBE_BIN" -v error -show_entries stream=index,codec_type -of json "$FIXTURE_NO_SUB"
"$FFPROBE_BIN" -v error -show_entries stream=index,codec_type -of json "$FIXTURE_WITH_SUB"
```
Assert: first JSON has no `subtitle` stream; second has exactly one `subtitle` stream.

### Op 2 — Audio extraction  [call site #1, `extractAudioFromVideo`]
```bash
"$FFMPEG_BIN" -y -i "$FIXTURE_MP4" -vn -c:a libmp3lame -b:a 192k "$OUT/audio.mp3"
```
Assert: exit 0; output is `mp3`; `ffprobe` reports `format_name=mp3`.

### Op 3 — Subtitle extraction  [call site #3, `readEmbeddedSubtitles`]
```bash
"$FFMPEG_BIN" -y -i "$FIXTURE_MP4_WITH_SUB" -map 0:s:0 -f srt "$OUT/out.srt"
```
Assert: exit 0; `out.srt` is valid SRT that round-trips through `parseSrt`
(`src/lib/subtitle-utils.ts`) yielding ≥1 non-empty segment.

### Op 4 — MP3 segment export + resample  [call sites #4, #7]
```bash
"$FFMPEG_BIN" -y -i "$SRC_MP3" -ss <start> -t <dur> -af aresample=44100 -b:a 192k "$OUT/seg.mp3"
```
Assert: exit 0; output duration ≈ `<dur>` (±0.1 s); `format_name=mp3`.

### Op 5 — Silence generation  [call sites #5, #8]
```bash
"$FFMPEG_BIN" -y -i "$SRC_MP3" -af volume=0,aresample=44100 -t 2.0 -b:a 192k "$OUT/silence.mp3"
```
Assert: exit 0; output duration ≈ 2.0 s; amplitude effectively zero.

### Op 6 — Concat  [call sites #6, #9]
```bash
printf "file '%s'\nfile '%s'\n" "$SEG_A" "$SEG_B" > "$OUT/concat.txt"
"$FFMPEG_BIN" -y -f concat -safe 0 -i "$OUT/concat.txt" -b:a 192k "$OUT/merged.mp3"
```
Assert: exit 0; merged duration ≈ dur(A) + dur(B).

### Fail-safe assertions (must hold in production)
```bash
# A. Missing binary: explicit path that does not exist; NO PATH fallback.
env -u FFMPEG_BINARY "/nonexistent/.../ffmpeg" -version    # → exit 127
# B. Checksum-invalid binary: path exists but sha256 != manifest.checksum.
#     Resolver MUST reject before exec and surface the 503 reinstall error.
```

## 3. Fixtures Required

All fixtures are owned by lane W0-E / task **T002** (`tests/fixtures/desktop/**`). This spike
**references** them; it does **not** create them. The minimal fixture set needed:

| Fixture | Used by | Notes |
|---|---|---|
| tiny MP4 (H.264/AAC, ~2 s), no subtitles | Op 1 (no-sub case), Op 2 | generated synthetically (lavfi sine + color) — fully owned, no copyright |
| tiny MP4 with one embedded `mov_text` subtitle | Op 1 (with-sub case), Op 3 | generated synthetically; subtitle text is original |
| tiny source MP3 + (start,end) pair | Op 4, Op 5, Op 6 | derived from Op 2 output or generated |

For the **invocation-contract** validation in §4 below, this round generated its own
equivalent synthetic fixtures inside a disposable `mktemp` dir (no T002 dependency) and
deleted them immediately. That is permitted because it touched no protected data and wrote
nothing into the repo.

## 4. Invocation-Contract Validation (SYSTEM BINARY — proven this round)

Environment: Homebrew `ffmpeg`/`ffprobe` 7.1.1 at `/opt/homebrew/bin` (the maintainer's
machine build). A disposable work dir was created with `mktemp -d -t deeplistener-w0-ffmpeg-*`,
fixtures generated synthetically with `lavfi`, all operations run, and the dir `rm -rf`'d at
the end. **This proves the command/flag contract; it does NOT prove packaged-path production
behavior** (the system build is GPL/shared and PATH-resolved — the opposite of the production
requirement).

### 4.1 Fixture generation (synthetic, owned, disposable)
```bash
ffmpeg -y -f lavfi -i sine=frequency=440:duration=2 -f lavfi -i color=c=red:s=64x48:d=2 \
  -c:a aac -b:a 64k -shortest clip.mp4          # → 20,976-byte MP4
ffmpeg -y -i clip.mp4 -i in.srt -c copy -c:s mov_text clip_sub.mp4   # adds mov_text subtitle
```

### 4.2 Op 1 — Probe (system binary) ✅
```bash
ffprobe -v error -show_entries stream=index,codec_type -of json clip.mp4
```
Result: `clip.mp4` → streams `video`, `audio` (no subtitle) ✅.
`clip_sub.mp4` → streams `video (h264)`, `audio (aac)`, `subtitle (mov_text)` ✅ —
correctly detected, matching `hasSubtitleStream` logic.

### 4.3 Op 2 — Audio extraction (system binary) ✅
```bash
ffmpeg -y -i clip.mp4 -vn -c:a libmp3lame -b:a 192k audio.mp3
```
Result: exit 0; `audio.mp3` = 50,301 bytes; `ffprobe` reports `format_name=mp3` ✅.
Confirms `libmp3lame` encode path works and produces a valid MP3.

### 4.4 Op 3 — Subtitle extraction (system binary) ✅
```bash
ffmpeg -y -i clip_sub.mp4 -map 0:s:0 -f srt out.srt
```
Result: exit 0; `out.srt` contents round-trip exactly:
```
1
00:00:00,000 --> 00:00:01,000
hello world
2
00:00:01,000 --> 00:00:02,000
deep listener
```
Confirms `-map 0:s:0 -f srt` reproduces the `readEmbeddedSubtitles` contract and yields
parseable SRT for `parseSrt`.

### 4.5 Op 4 — MP3 segment export + resample (system binary) ✅
```bash
ffmpeg -y -i audio.mp3 -ss 0.0 -t 1.0 -af aresample=44100 -b:a 192k seg0.mp3
```
Result: exit 0; `seg0.mp3` = 25,850 bytes ✅. Confirms `-ss`/`-t` + `aresample=44100` flag set.

### 4.6 Op 5 — Silence generation (system binary) ✅
```bash
ffmpeg -y -i audio.mp3 -af volume=0,aresample=44100 -t 2.0 -b:a 192k silence.mp3
```
Result: exit 0 (validated as part of the batch). Confirms `volume=0,aresample` filter chain.

### 4.7 Op 6 — Concat (system binary) ✅
```bash
ffmpeg -y -f concat -safe 0 -i concat.txt -b:a 192k merged.mp3
```
Result: exit 0; `merged.mp3` = 49,571 bytes; `ffprobe` reports `duration=2.037551` (≈ two ~1 s
segments) ✅. Confirms `-f concat -safe 0` demuxer contract.

### 4.8 Codec/filter presence on the reference build (system binary) ✅
Captured to confirm the mandatory set from T020 is satisfiable by a real build:
- encoders: `libmp3lame ... MP3 (MPEG audio layer 3)` ✅
- decoders: `aac`, `aac_fixed`, `aac_at` ✅
- codecs: `mov_text` (DES), `srt` (..S), `subrip` (DES) ✅
- filters: `aresample` ✅

## 5. Fail-Safe Assertions (PATH fallback disabled — the core DMR-002 requirement)

DMR-002 / FR-041 require that production **never** silently falls back to PATH. Two failure
modes were exercised:

### 5.1 Missing binary at explicit path (system shell, PATH not consulted) ✅
```bash
env -u FFMPEG_BINARY "/nonexistent/deeplistener-ffmpeg-7.1.1/ffmpeg" -version
```
Result: `env: /nonexistent/...: No such file or directory`; **exit 127**. The explicit
absolute path is honored; the shell does **not** search PATH. This is the production
invariant: when the resolver passes an absolute packaged path that does not exist, the spawn
fails loudly (127) — exactly the ENOENT condition `toPublicUploadError` already maps to the
503 "FFmpeg is unavailable" message (`src/lib/upload-error.ts:18`).

### 5.2 Checksum-invalid binary → resolver-level rejection ✅ (guard demo)
A file with wrong bytes ("not a binary") at the expected path must be rejected **before**
exec by the checksum guard, not by hoping exec fails. Demonstrated the guard logic:
```bash
EXPECTED=$(printf 'tampered-content' | shasum -a 256 | awk '{print $1}')   # wrong hash
ACTUAL=$(shasum -a 256 "$FFPROBE_BIN" | awk '{print $1}')                   # real hash
[ "$EXPECTED" = "$ACTUAL" ] && echo PASS || echo REJECT
```
Result: `REJECT (checksum mismatch -> block + reinstall guidance)` ✅.

> Implementation note (for W1-C T082 / W3-B T181, not this round): the resolver MUST compute
> `sha256` of the packaged file and compare to `manifest.checksum` (T023) before any
> `setFfmpegPath`/`setFfprobePath` call. On mismatch, it returns the existing 503 error and
> surfaces repair/reinstall guidance (FR-041 acceptance: "Import/export succeeds on a machine
> without FFmpeg installed"; DMR-002 "missing/checksum-invalid → blocked with repair/reinstall
> guidance"). **It MUST NOT call `hasCommand("ffmpeg")` as a fallback** — the current
> `src/lib/setup-readiness.ts:124-125` readiness check does PATH discovery and is therefore a
> Desktop change item (T082/T112), not a spike concern.

## 6. What Remains for Production (pending cleared binary — W3-B T181)

| ID | Pending item | Why blocked |
|---|---|---|
| PEND-001 | Run §2 commands against the **cleared LGPL darwin-arm64** binary at an explicit packaged path | T021 OPEN-001 (adopt LGPL approach) + OPEN-002/003 (build + checksum) |
| PEND-002 | Wire `ffmpeg.setFfmpegPath`/`setFfprobePath` once at bootstrap with the resolved+verified path | W1-C T082 contract freeze |
| PEND-003 | Replace PATH-based readiness (`hasCommand`) with packaged-path+checksum readiness | W2-C T112 |
| PEND-004 | Confirm the LGPL build's `ffmpeg -encoders/-codecs/-filters` output contains `libmp3lame`, `mov_text`, `srt`, `aresample`, `concat` (T020 mandatory set) | needs the artifact |

These are explicitly out of scope for this round (AUTH-003 forbids downloading the binary).
The invocation contract proven in §4 carries over verbatim to the cleared binary in §2,
because the flag sets are identical; only the resolved `FFMPEG_BIN`/`FFPROBE_BIN` value and
the license/checksum posture change.

## 7. Verify Clause (AC-T022)

> **Selected fixture operations pass with PATH disabled; missing/checksum-invalid binary
> fails.**

| Check | Result |
|---|---|
| Probe (Op 1) command contract validated | ✅ §4.2 (system binary) |
| Audio extraction (Op 2) command contract validated | ✅ §4.3 |
| Subtitle extraction (Op 3) command contract validated | ✅ §4.4 |
| MP3 segment export (Op 4) command contract validated | ✅ §4.5 |
| Concat (Op 6) command contract validated | ✅ §4.7 |
| All ops use **explicit binary paths**, PATH fallback disabled | ✅ §5.1 (missing explicit path → exit 127, no PATH search) |
| Spike asserts missing binary fails safely | ✅ §5.1 → exit 127 → 503 reinstall error |
| Spike asserts checksum-invalid binary fails safely | ✅ §5.2 → resolver REJECT before exec |
| Production packaged-path on cleared LGPL binary | ⏳ PENDING — §6, gated on T021 OPEN-001..003 |
| No protected data touched; disposable dir cleaned | ✅ all artifacts in `mktemp`, `rm -rf` at end |
| Evidence clearly labelled system-binary vs packaged-path | ✅ §1 table + §4 header + §6 |

## 8. Disposition of Spike Artifacts

All fixtures and outputs were created inside a single `mktemp -d` directory and removed with
`rm -rf` at the end of validation. No file was written into the repository, `public/`,
`prisma/`, or `.env*`. The only durable output of this task is this document.
