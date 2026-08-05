# Legacy Safety Profile: Desktop Alpha System FFmpeg

## Protected resources

- `prisma/dev.db`: read-only; baseline SHA-256 `171657900df49dd5a20f37f029923b33cce830467b831edf97e1e015deccaaff`, size `47345664`, mtime `1785741736`.
- Desktop database: read-only; current-turn baseline SHA-256 `7d6e9ae05ddcd6681ada6df3b329cdcf3b53cce6c29c7cb7a76c8146eab802ff`, size `151552`, mtime `1785933544`.
- `public/uploads`: 232 files; `public/videos`: 2 files.
- `.env*`, credentials, sync targets, and installed `/Applications/DeepListener.app`: do not edit.

The Desktop database changed between the previous completed turn and this turn because the user ran the client. This sprint accepts the newly observed state as its baseline and does not write it.

## Rollback

Revert only the scoped Desktop runtime-resolution, packaging-contract, tests, and this session's harness files. Generated `.desktop-build` output is disposable. No database rollback should be necessary because verification uses clean temporary profiles.
