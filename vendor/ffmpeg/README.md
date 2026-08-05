# Vendored FFmpeg binaries (release input)

DeepListener uses `ffmpeg` and `ffprobe` for video MP3 extraction, audio
export, and embedded-subtitle detection.

In a packaged Desktop build the shell resolves these binaries only from a
checksum-verified manifest. It never silently falls back to the host `PATH`.
Development builds may still use `FFMPEG_PATH`/`FFPROBE_PATH` or the system
`PATH` for local testing.

## Required release layout

Vendoring is required for a public Desktop build. If the assets are absent,
the packaged app starts in a limited media-runtime state and media
import/export is intentionally unavailable rather than executing an
unverified binary.

```text
vendor/ffmpeg/<platform>-<arch>/ffmpeg(.exe)
vendor/ffmpeg/<platform>-<arch>/ffprobe(.exe)
vendor/ffmpeg/<platform>-<arch>/assets.json
```

Use `darwin-arm64`, `darwin-x64`, or `win32-x64` for `<platform>-<arch>`.
`assets.json` must contain complete metadata for exactly one `ffmpeg` and one
`ffprobe` entry as specified in
`docs/desktop-w0/runtime-asset-manifest.md`. The packager computes the final
SHA-256 after copying the files.

```bash
chmod +x vendor/ffmpeg/darwin-arm64/ffmpeg vendor/ffmpeg/darwin-arm64/ffprobe
npm run desktop:package
```

## Requirements

- **Platform/arch must match the target.** Set
  `DEEPLISTENER_TARGET_PLATFORM` and `DEEPLISTENER_TARGET_ARCH` only when the
  packaging environment already contains matching Prisma and media assets;
  the script does not download or cross-fetch binaries.
- **Executable bit** must be set on Unix. The packager re-asserts `0o755`
  defensively.
- **Capabilities:** an ffmpeg entry must include `libmp3lame`, `aresample`,
  `volume`, `concat`, and at least one of `mov_text`, `subrip`, or `srt`.
- **Licensing:** FFmpeg is LGPL/GPL. See [../NOTICE](../../NOTICE) for the
  attribution already recorded for the project. GPL builds must declare a GPL
  license; nonfree builds are rejected and LGPL is the preferred posture.

## Git tracking

The binaries and per-target `assets.json` are **gitignored** (see
`../../.gitignore`). Only this README and `.gitkeep` are committed, so each
release pipeline supplies its own licensed, checksummed assets.
