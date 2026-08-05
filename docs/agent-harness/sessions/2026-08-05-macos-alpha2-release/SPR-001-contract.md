# DeepListener macOS Alpha 2 Release Contract

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Version | `0.3.0-alpha.2` |
| Target | GitHub prerelease, unsigned macOS arm64 DMG |

## Requirements

1. Commit the legacy database and internal Alpha FFmpeg fixes without unrelated files.
2. Pass `npx tsc --noEmit`, `npm run verify`, package audit, DMG verification, and disposable packaged-runtime smoke checks.
3. Build the DMG from the exact release commit and tag that commit as annotated `v0.3.0-alpha.2`.
4. Preserve local databases, media, secrets, and the installed client.
5. Publish a GitHub prerelease with the DMG SHA-256 and explicit unsigned/system-FFmpeg limitations.
6. Verify remote branch/tag parity and the uploaded asset digest.

## Stop conditions

- Stop on any failing gate, version/tag/artifact mismatch, unexpected protected-data write, secret exposure, or remote divergence.
- Do not sign, notarize, run `npm run sync`, execute Prisma migration commands, or replace the installed app.
