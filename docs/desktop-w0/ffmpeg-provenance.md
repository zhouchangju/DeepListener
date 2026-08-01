# T021 — FFmpeg Binary Provenance & Legal Memo (no download)

| Field | Value |
|---|---|
| Sprint | SPR-001 (W0 Desktop Feasibility, Adversarial) |
| Lane | W0-B |
| Task | T021 — Select candidate redistributable binary source (LEGAL MEMO, no download) |
| Req | DRD-003, proposal external obligations, OD-003 |
| Baseline commit | `960ec85` |
| Date | 2026-07-22 |
| Scope | **Research + legal memo only.** Per AUTH-003: no binary downloaded, no binary committed, no dependency installed this round. |

## 1. Context & Constraint

DeepListener is MIT-licensed. The desktop build (Electron) must **redistribute** an
FFmpeg/ffprobe binary inside the `.app` bundle and invoke it via an explicit packaged path
(FR-041, DMR-002). Redistributing a binary brings the **license of that build** into the
product's obligations.

The maintainer's current machine has Homebrew `ffmpeg 7.1.1`:

```
configuration: --enable-shared ... --enable-gpl --enable-libmp3lame --enable-libx264
                --enable-libx265 ... --enable-libaom --enable-libvpx ... (GPL)
```

This build is `--enable-gpl` (and links GPL libs like `libx264`, `libx265`, `libfdk_aac`-adjacent
codec set, `libaom`, `libvpx`, etc.) **and** `--enable-shared` (dynamic libs). It is **not
re-distributable inside an MIT-licensed product** without converting the whole product to GPL
or meeting full GPL-3.0 source-offer obligations — an unacceptable outcome for an MIT app.
So Homebrew's build is disqualified as a redistribution source.

**Goal of this memo:** select ONE candidate `darwin-arm64` source that DeepListener can
legally redistribute alongside MIT code, document its obligations, and explicitly state any
codec gaps versus the T020 required set. Per AUTH-003, T022 may then validate the *invocation
contract* with the system Homebrew binary only; production packaged-path behavior is gated on
this memo being cleared.

## 2. What DeepListener Actually Needs (from T020)

Re-stated from `ffmpeg-inventory.md` §5 so this memo is self-contained:

- **Mandatory encode:** MP3 via `libmp3lame` @ 192k (audio extraction + all export paths).
- **Mandatory decode:** MP4 (H.264/AAC) and WebM (VP8/VP9/Opus/Vorbis), plus the accepted
  audio extension set (AAC, FLAC, Opus, Vorbis, WAV/PCM, MP3, AIFF).
- **Mandatory filters/protocols:** `aresample`, `volume`, `concat` demuxer.
- **Mandatory subtitle:** decode `mov_text`/`subrip`, mux `-f srt`.
- **NOT used anywhere:** H.264/H.265 **encode** (`libx264`/`libx265`). DeepListener never
  encodes video. This is the decisive fact: **a pure LGPL build is fully sufficient.**

Because `libmp3lame` (LAME) is itself **LGPL-2.1** (not GPL), an FFmpeg built `--enable-lgpl
--enable-libmp3lame` (and **without** `--enable-gpl`, **without** `--enable-nonfree`, and
**without** any GPL-only lib such as `libx264`/`libx265`/`libfdk_aac`/`libaom`-under-GPL)
remains LGPL-licensed and is compatible with redistribution inside an MIT application,
provided the LGPL boundary obligations (NOTICE, source-offer for the FFmpeg/LAME portions,
allowing replacement of the LGPL library) are met.

## 3. Candidate Sources Evaluated

### 3.1 evermeet.cx — REJECTED for darwin-arm64

- **URL:** `https://evermeet.cx/ffmpeg/`
- **Platform/arch:** **macOS Intel (x86_64) only.** The maintainer states on the page that
  he does not provide native Apple-Silicon/ARM binaries.
- **License:** builds are `--enable-gpl` with `libx264`, `libx265`, `libmp3lame`, etc. →
  **GPL** builds, not LGPL.
- **Codec coverage:** broad, but irrelevant — wrong arch and wrong license.
- **Redistribution terms:** evermeet binaries are commonly redistributed but under GPL terms.
- **Verdict:** Disqualified. Cannot serve darwin-arm64 and cannot meet LGPL intent.

### 3.2 BtbN/FFmpeg-Builds — REJECTED for darwin-arm64

- **URL:** `https://github.com/BtbN/FFmpeg-Builds` (releases + `code.ffmpeg.org/BtbN/FFmpeg-Builds`)
- **Platform/arch:** **win64 and linux64/linux-arm64 only.** The repo states
  "Auto-Builds run ONLY for win64 and linux(arm)64." **No darwin/macOS builds** are produced.
- **License:** both `gpl` (all deps) and `lgpl` variants exist for the supported platforms;
  the LGPL variant is the redistributable-friendly one *where available*.
- **Verdict:** Disqualified for macOS. (Relevant for the future Windows x64 target T272: the
  BtbN **LGPL** win64 build is a strong candidate there. Noted for T272, not usable for M1.)

### 3.3 Martin Riedl build server (`ffmpeg.martin-riedl.de`) — REJECTED for LGPL goal

- **URL:** `https://ffmpeg.martin-riedl.de/`
- **Platform/arch:** provides macOS amd64 **and** arm64 static builds (ff/ffprobe/ffplay).
- **License:** builds include the full GPL codec set → **GPL**, not LGPL.
- **Verdict:** Has arm64, but GPL. Usable only if DeepListener were willing to take GPL
  obligations. Rejected for the MIT/LGPL objective.

### 3.4 osxexperts.net / osxffmpeg / community arm64 builds — REJECTED

- **Provenance unclear:** these are community-published arm64 builds with inconsistent
  licensing metadata, no published build configuration, and no verifiable checksum chain.
- **License:** typically GPL (x264/x265 enabled).
- **Verdict:** Unfit for a reproducible, auditable release manifest (DRD-003 requires
  traceability to a tagged commit + documented toolchain). Rejected.

### 3.5 `@ffmpeg-installer/darwin-arm64` (npm) — REJECTED

- **URL:** `https://www.npmjs.com/package/@ffmpeg-installer/darwin-arm64`
- **Platform/arch:** darwin-arm64 ✅
- **Version:** pinned to FFmpeg **4.1.5** (≈5 years stale as of 2026), with known security
  and format bugs fixed in later releases.
- **License:** GPL build (codec set).
- **Verdict:** Stale and GPL. Disqualified.

### 3.6 Self-built minimal LGPL FFmpeg (from upstream source) — RECOMMENDED

- **Source URL:** `https://ffmpeg.org/releases/` (upstream release tarball, e.g.
  `ffmpeg-7.1.x.tar.xz`, content-verified against the published `*.asc` signature and the
  FFmpeg PGP key).
- **Platform/arch:** `darwin-arm64` (built natively on an Apple-Silicon Mac, or cross-built
  via the documented toolchain).
- **Build config (minimal, LGPL, covers T020 needs):**
  ```bash
  ./configure \
    --prefix=... \
    --enable-lgpl \
    --enable-version3 \
    --enable-libmp3lame \
    --disable-gpl \
    --disable-nonfree \
    --enable-static \
    --disable-shared \
    --disable-programs=false \
    --disable-doc \
    --enable-pthreads \
    --enable-audiotoolbox \
    --enable-videotoolbox
    # NOTE: deliberately OMIT libx264, libx265, libfdk_aac, libaom-under-GPL, etc.
    # LAME must be built separately as an LGPL static lib and linked here.
  make -j$(nproc)
  ```
  (`--enable-audiotoolbox`/`--enable-videotoolbox` tap Apple's system frameworks for
  hardware H.264 decode on macOS; these are LGPL-compatible system-framework wrappers and
  keep the binary LGPL while giving good decode performance.)
- **License:** **LGPL-2.1-or-later** (FFmpeg core + LAME). No GPL component, no nonfree.
- **Codec coverage vs T020 requirement:** ✅ all mandatory items covered
  (native H.264/AAC/VP8/VP9/Opus/Vorbis/FLAC/PCM decode are LGPL-in-core; `libmp3lame`
  provides MP3 encode; `mov_text`/`subrip` decode + SRT mux are in-core; `aresample`/
  `volume`/`concat` are in-core). **No codec gap** for DeepListener's actual usage —
  H.264/H.265 **encode** is unused (T020 §5).
- **Checksum source:** the build is reproducible from a pinned FFmpeg release + pinned LAME
  release; the resulting `ffmpeg`/`ffprobe` binaries are hashed (sha256) by the
  maintainer's release pipeline and recorded in the manifest (T023). Upstream tarball
  authenticity verified via FFmpeg's PGP-signed release (`*.asc`).
- **Attribution / NOTICE obligations:** ship `LICENSE-LGPL-2.1`, `COPYING.LGPLv2.1` from
  FFmpeg, the LAME `LICENSE` (LGPL), and a NOTICE file crediting FFmpeg + LAME + a written
  offer / link to the corresponding source (the pinned build script + tarball hashes).
- **Redistribution obligations (LGPL-2.1):**
  1. Provide the FFmpeg + LAME license texts.
  2. Provide a written offer for the **corresponding source** of the LGPL portions (the
     pinned build script and tarball locations satisfy this).
  3. Allow the user to **replace** the LGPL library — satisfied because the binary is a
     standalone CLI invoked via explicit path (not statically linked into DeepListener's
     own code), so replacement = swapping the file at the packaged path.
  4. Display the LGPL notice in the About/legal UI.
- **Codec gaps affecting DeepListener:** **None.** The only capability intentionally
  omitted (H.264/H.265 *encode*) is not used by any call site (T020).

## 4. Recommendation

**Recommended candidate for darwin-arm64 (M1 feasibility): self-built minimal LGPL FFmpeg
(static, `--enable-lgpl --enable-libmp3lame`, no GPL/nonfree).** Rationale:

1. It is the only candidate that is simultaneously (a) `darwin-arm64`, (b) **LGPL** (MIT-
   compatible), and (c) covers 100% of T020's mandatory codec/filter set with no gaps.
2. It is **reproducible and auditable** (DRD-003 / NFR-052): traceable to a tagged upstream
   FFmpeg + LAME release and a committed build script, rather than an opaque third-party blob.
3. It keeps DeepListener **MIT** rather than forcing the project to GPL.
4. It does **not** depend on a single community maintainer's goodwill or uptime.

**For the future Windows x64 target (T272, out of scope this round):** the BtbN/FFmpeg-Builds
**LGPL** win64 release is the recommended parallel candidate (same LGPL posture, native
win64). This memo focuses on darwin-arm64 per FR-081/DRD-001 (macOS-first).

## 5. Open Items Before T022 Can Use a Real Packaged Binary

(Production packaged-path execution in T022/W3 is gated on these; **the invocation-contract
validation in T022 this round uses the system Homebrew binary only**, per AUTH-003.)

| ID | Open item | Owner | Blocks |
|---|---|---|---|
| OPEN-001 | Maintainer decision to adopt the self-built LGPL approach (vs. accepting GPL) | user / T050 gate | committing any binary |
| OPEN-002 | Stand up a reproducible build script + pinned FFmpeg/LAME versions + PGP verification | W3-B (T181) | producing the actual artifact |
| OPEN-003 | Generate and publish sha256 checksums into the manifest (T023 schema) | W3-B (T181) | runtime asset validation |
| OPEN-004 | Author the NOTICE/LICENSE/NOTICE-LGPL files and About-UI text | W3-B (T181) | license compliance |
| OPEN-005 | Decide whether to publish the corresponding-source offer URL (LGPL §) | T050 / legal | redistribution |

## 6. Verify Clause (AC-T021)

> **Source/version/arch/checksum/license/redistribution documented; unresolved
> license/provenance would block T022.**

| Check | Result |
|---|---|
| Candidate source URL documented | ✅ `https://ffmpeg.org/releases/` (upstream) + pinned LAME |
| Version | ✅ pinned FFmpeg 7.1.x + LAME release (exact pin to be fixed at build time, T181) |
| Platform / arch | ✅ `darwin-arm64` |
| Checksum source | ✅ upstream PGP-signed tarball + maintainer release-pipeline sha256 → manifest (T023) |
| Enabled codecs vs required (T020) | ✅ all mandatory covered; libx264/libx265 deliberately omitted (unused) — **no gap** |
| License | ✅ LGPL-2.1-or-later (no GPL, no nonfree) |
| Attribution / NOTICE | ✅ documented in §3.6 |
| Redistribution obligations | ✅ documented in §3.6 (LGPL boundary: CLI invoked by explicit path, swappable) |
| Codec gaps affecting usage | ✅ **none** (only H.264/H.265 encode omitted, which is unused) |
| Unresolved items explicit | ✅ OPEN-001..005 |
| **Does unresolved provenance block T022?** | **Partially.** The **invocation contract** (commands/flags) does NOT depend on the cleared binary and is validated this round with the system binary (AUTH-003). The **packaged-path production behavior** (real checksum-verified LGPL binary at an explicit path) IS blocked until OPEN-001..003 are resolved in W3 (T181). T022 states this split explicitly. |

## 7. Sources Consulted

- FFmpeg official legal page — https://ffmpeg.org/legal.html
- FFmpeg LGPL/GPL build configuration — https://ffmpeg.org/
- LAME MP3 encoder (LGPL) — https://lame.sourceforge.io/ , https://lame.sourceforge.io/license.txt
- "How do you build LGPL version of ffmpeg with libmp3lame?" — https://stackoverflow.com/questions/31457426/how-do-you-build-lgpl-version-of-ffmpeg-with-libmp3lame
- evermeet.cx static binaries (Intel-only, GPL) — https://evermeet.cx/ffmpeg/
- BtbN/FFmpeg-Builds (win64/linux64 only) — https://github.com/BtbN/FFmpeg-Builds , https://code.ffmpeg.org/BtbN/FFmpeg-Builds
- BtbN LGPL variant — https://winstall.app/apps/BtbN.FFmpeg.LGPL.8.0
- Martin Riedl build server (arm64, GPL) — https://ffmpeg.martin-riedl.de/
- `@ffmpeg-installer/darwin-arm64` (stale 4.1.5, GPL) — https://www.npmjs.com/package/@ffmpeg-installer/darwin-arm64
- Building FFmpeg from source on macOS (Qt docs) — https://doc.qt.io/qt-6/qtmultimedia-building-ffmpeg-macos.html
- Kap/ffmpeg-static GPL+MIT license discussion — https://github.com/wulkano/Kap/issues/1276

## 8. Memo Status

**Status: RECOMMENDATION RECORDED, gated.** No binary downloaded or committed (AUTH-003).
The recommendation (self-built LGPL, darwin-arm64, `--enable-libmp3lame`, no GPL/nonfree,
no codec gap vs T020) is ready for the T050 feasibility gate to accept or revise. Until the
maintainer approves the approach (OPEN-001) and the build pipeline produces a checksum-verified
artifact (OPEN-002/003), T022 validates the **invocation contract** only, using the system
Homebrew ffmpeg, with explicit assertions that production must disable PATH fallback.
