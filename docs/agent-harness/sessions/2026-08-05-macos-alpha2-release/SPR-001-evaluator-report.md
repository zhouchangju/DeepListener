# DeepListener macOS Alpha 2 Release Evaluator Report

| Field | Value |
|---|---|
| status | pass |
| release commit | `826c55f26523c5348080c7f10ab801aed006198f` |
| tag | annotated `v0.3.0-alpha.2`; object `9b3703b1659346ebd64f0ab533f6082fbd6dfbd3` |
| artifact | `DeepListener-0.3.0-alpha.2-arm64.dmg`; 148,935,941 bytes; SHA-256 `35cd04e62cf7e16218d5c0992c0b47396e3e68d944d5ca2795b9d9c040475f6e` |
| repository gates | `npx tsc --noEmit` passed; `npm run verify` passed with 581/581 tests |
| package/runtime verification | package audit passed for 2,373 files; `hdiutil verify` passed; clean and legacy-database mounted-DMG smokes both reached service healthy |
| protected data | repository DB hash/size/mtime and media counts matched the pre-release baseline; the real Desktop DB passed read-only integrity check; the installed Alpha 1 app was not replaced |
| GitHub prerelease | [published](https://github.com/zhouchangju/DeepListener/releases/tag/v0.3.0-alpha.2); remote asset size and digest match the local artifact |

## Runtime evidence

- The clean disposable launch resolved capability-checked system FFmpeg/ffprobe
  from an approved internal-Alpha location and exited successfully after the
  local service became healthy.
- The legacy disposable database launch also became healthy. SQLite reported
  `ok`, the portable tracker contained all 16 migrations, and `ReviewItem`
  contained `state`, `reps`, `lapses`, and `lastReview`.
- The legacy source backup SHA-256 remained
  `58ba6920d16a3bb7948e12f59b672c4bec1c3b7eff1b39b5351f75b97e3bac56`
  before and after the smoke test.

## Release boundary

- This is an unsigned and unnotarized macOS arm64 internal Alpha.
- Homebrew FFmpeg/ffprobe remains a host dependency for video import and
  generated-audio export.
- No Windows package was produced. The previous `v0.3.0-alpha.1` release remains
  available as rollback evidence.
