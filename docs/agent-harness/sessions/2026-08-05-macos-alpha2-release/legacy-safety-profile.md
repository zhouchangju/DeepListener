# Legacy Safety Profile: macOS Alpha 2 Release

## Protected resources

- `prisma/dev.db`: do not write, migrate, package, or sync.
- Desktop data root: do not use for package/runtime verification.
- `public/uploads`, `public/videos`, `.env*`, credentials, and installed `/Applications/DeepListener.app`: do not modify.
- GitHub target: `zhouchangju/DeepListener`, new prerelease/tag only; retain `v0.3.0-alpha.1` for rollback.

## Baseline

- Repository database SHA-256: `171657900df49dd5a20f37f029923b33cce830467b831edf97e1e015deccaaff`; size `47345664`; mtime `1785741736`.
- Media counts: `public/uploads` 232 files; `public/videos` 2 files.
- Existing installed app runtime manifest predates Alpha 2 and must remain unchanged.

## Rollback

- Local: revert the release metadata commit.
- Remote: delete the Alpha 2 prerelease and tag if artifact verification fails; `v0.3.0-alpha.1` remains available.
- Protected data: none expected because all runtime checks use disposable roots.
