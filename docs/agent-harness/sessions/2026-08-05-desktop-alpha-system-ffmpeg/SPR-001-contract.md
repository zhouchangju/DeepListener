# Sprint Contract: Desktop Alpha System FFmpeg

## Goal

An explicitly built internal Alpha package may use an executable `ffmpeg`/`ffprobe` pair from the standard Homebrew locations when verified bundled assets are absent. Public/default packages remain fail-closed and PATH-independent.

## Acceptance criteria

1. A package marked `internal-alpha` with system fallback enabled resolves a complete executable pair from `/opt/homebrew/bin` or `/usr/local/bin`.
2. Missing marker, public/default package, unsupported platform, or partial pair remains `missing` and never probes arbitrary `PATH` entries.
3. Verified bundled assets retain priority over the Alpha fallback.
4. The standalone service receives an explicit `system` runtime status and setup readiness reports FFmpeg ready.
5. `desktop:dist --alpha` records the fallback permission in the redacted runtime manifest; default distribution does not.
6. Protected data and the installed client remain unchanged.

## Verification

- Failing-then-passing targeted tests for runtime resolution, main-process wiring, packaging marker, and readiness.
- `npm run verify`.
- `npm run desktop:dist -- --dir --alpha`, manifest inspection, and packaged main-process/runtime smoke without touching the real data root.
