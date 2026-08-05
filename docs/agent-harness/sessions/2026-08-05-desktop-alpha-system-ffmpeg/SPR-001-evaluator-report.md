# Evaluator Report: Desktop Alpha System FFmpeg

| Field | Value |
|---|---|
| Status | accepted |
| Scope | Internal Alpha system FFmpeg fallback; public package remains fail-closed |
| Protected data | Repository DB unchanged at baseline SHA-256/size/mtime; media counts unchanged; installed app manifest remains the earlier `2026-08-05T09:29:49.492Z` build. The real Desktop DB changed while a pre-existing user-started build process remained active, but every agent runtime check used a disposable `DEEPLISTENER_DATA_DIR`; read-only integrity check is `ok`. |
| Targeted tests | 34/34 passed across runtime resolver, distribution policy, packaging contract, main-process wiring, and setup readiness |
| Full gate | `npm run verify`: lint passed, 581/581 tests passed, production build passed |
| Packaged runtime | `npm run desktop:dist -- --dir --alpha` passed; manifest is `internal-alpha` with fallback enabled; resolver selected `/opt/homebrew/bin/ffmpeg` and `/opt/homebrew/bin/ffprobe`; isolated Electron smoke logged system resolution and a healthy service, exit 0 |
| Public boundary | Default `--no-package` reuse of the Alpha standalone was rejected before packaging; a public manifest disables system fallback |
| Findings | Initial review found cross-channel cache reuse and insufficient binary validation. Both were fixed; final Standards and Spec reviews found no remaining HIGH/MEDIUM issues. |

## Accepted behavior

- Verified bundled FFmpeg assets retain first priority.
- Internal Alpha fallback is authorized only by the package manifest, checks only fixed Homebrew roots, and runs bounded version/capability probes.
- Public/default packages and mismatched cached bundles fail closed.
- The service receives `DEEPLISTENER_RUNTIME_ASSET_STATUS=system`, so setup readiness reports media tools ready without probing its own PATH.

## Remaining release limitation

The generated internal Alpha app is unsigned and not notarized. Public distribution still requires verified vendored FFmpeg assets plus the existing signing/notarization gates.
