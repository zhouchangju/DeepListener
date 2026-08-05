# DeepListener macOS Alpha Release Evaluator Report

| Field | Value |
|---|---|
| status | success within internal-alpha scope |
| summary | Versioned DMG, annotated tag, push, and GitHub prerelease completed. |
| artifacts | `.desktop-build/dist/DeepListener-0.3.0-alpha.1-arm64.dmg` |

## Checklist

| Requirement | Result | Evidence |
|---|---|---|
| Version and tag match | pass | root/Desktop `0.3.0-alpha.1`; tag resolves to `54940a8` |
| Full repository gate | pass | lint, 571/571 tests, and production build passed |
| Package content safe | pass | 2,362 files audited; no traced user data |
| DMG integrity | pass | 148,916,454 bytes; `hdiutil verify` valid; SHA-256 `0e861f2128a569d50499570b9016e172f55cead840e5dc9806ba0081ef9bbb71` |
| Packaged startup | pass | disposable clean-profile DB initialized; service became healthy |
| Protected data unchanged | pass | database/media size and mtime unchanged; no sync or migration run |
| Remote release complete | pass | GitHub prerelease and DMG asset published; remote digest matches local |

## Accepted limitations

- This is an unsigned, unnotarized Apple Silicon internal alpha; `codesign`
  and `spctl` checks fail as expected.
- It uses system FFmpeg and is not a self-contained public release.
- Public-release preflight remains intentionally fail-closed.

## Publication

- Release: <https://github.com/zhouchangju/DeepListener/releases/tag/v0.3.0-alpha.1>
- Release commit: `54940a84548932c170a138e6decd43838e52ee7f`
- Annotated tag object: `58a25a752bb036af8988e863dbe851f6966f86e3`
- Rollback remains deletion of the prerelease/tag followed by a revert of the
  release metadata commit; no protected-data rollback is required.
