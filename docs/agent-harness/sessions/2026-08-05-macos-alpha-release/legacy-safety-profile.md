# DeepListener macOS Alpha Release Safety Profile

| Field | Value |
|---|---|
| Session | `2026-08-05-macos-alpha-release` |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected data

| Resource | Status before | Allowed operations | Stop condition |
|---|---|---|---|
| `prisma/dev.db` | exists, 47,345,664 bytes | metadata check only | any write, migration, deletion, or sync |
| `public/uploads/` | exists | metadata check only | any write, deletion, or sync |
| `public/videos/` | exists | metadata check only | any write, deletion, commit, or sync |
| `.env*` | local configuration may exist | do not inspect values | editing or printing secrets |

## Scope and rollback

- In scope: version metadata, release documentation, quality gates, unsigned
  Apple Silicon DMG, Git tag, push, and GitHub prerelease asset.
- Out of scope: database/media changes, sync, signing, notarization, public
  release claims, and release-host update manifests.
- Rollback: delete the remote prerelease/tag if publication is invalid, then
  revert the release metadata commit. No protected data restoration is needed.
