# Vendored FFmpeg binaries (optional)

DeepListener uses `ffmpeg` and `ffprobe` for video MP3 extraction, audio
export, and embedded-subtitle detection. At runtime the Desktop shell
resolves these binaries in this priority order:

1. `FFMPEG_PATH` / `FFPROBE_PATH` environment variables (dev/test override);
2. the files in **this directory** (`vendor/ffmpeg/ffmpeg` and
   `vendor/ffmpeg/ffprobe`), if present;
3. the system `PATH` (the default — `fluent-ffmpeg` finds them itself).

## When to vendor binaries

Vendoring is **optional**. If you skip it, the packaged app relies on the
user having FFmpeg installed on their system, which is acceptable for a
technical audience but will break media import for users without FFmpeg on
their `PATH`.

If you want the packaged app to be fully self-contained (no system FFmpeg
required), place matching static binaries here before running the desktop
packaging script:

```bash
# Example: download macOS arm64 static builds (verify the source yourself)
#   ffmpeg  → vendor/ffmpeg/ffmpeg
#   ffprobe → vendor/ffmpeg/ffprobe
chmod +x vendor/ffmpeg/ffmpeg vendor/ffmpeg/ffprobe
npm run desktop:package
```

## Requirements for the binaries

- **Platform/arch must match the packaging host** (the script does not
  cross-fetch). For a `darwin-arm64` build, place `darwin-arm64` binaries.
- **Executable bit** must be set (`chmod +x`). The packaging script re-asserts
  `0o755` defensively, but set it here too.
- **Licensing**: FFmpeg is LGPL/GPL. See [../NOTICE](../../NOTICE) for the
  attribution already recorded for the project. If you redistribute the
  binaries inside a release, review FFmpeg's licensing terms for your
  distribution scenario.

## Git tracking

The binaries themselves are **gitignored** (see `../../.gitignore`). Only
this README and `.gitkeep` are committed, so each packager supplies their
own binaries. This keeps the repository small and avoids committing large,
platform-specific artifacts.
