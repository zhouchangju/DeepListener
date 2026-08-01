---
name: Bug report
about: Something in DeepListener is broken or behaves incorrectly
title: "[Bug] "
labels: ["bug", "needs-triage"]
---
## Describe the bug

A clear, concise description of what's wrong.

## To reproduce

1.
2.
3.

**Expected behavior:**

**Actual behavior:**

## Environment

| Field | Value |
| --- | --- |
| How are you running? | _desktop dmg / from source_ |
| DeepListener version or commit | _e.g. `0.2.0` or `git rev-parse HEAD`_ |
| OS | _e.g. macOS 15 (arm64), Windows 11_ |
| Node version (`node -v`) | _only if running from source_ |
| Transcription provider | _OpenAI / Deepgram / Google / unset_ |
| Provider key configured? | _yes / no_ |
| FFmpeg source | _vendored (`vendor/ffmpeg/`) / system PATH / missing_ |

## Self-check

- [ ] I read [SUPPORT.md](https://github.com/zhouchangju/DeepListener/blob/main/SUPPORT.md) and ran the pre-check list.
- [ ] `npx prisma generate` ran after install.
- [ ] `ffmpeg -version` and `ffprobe -version` both print a version.

## Logs, screenshots, or reproduction media

_Paste relevant logs, console output, or screenshots. Do **not** paste your real API keys or private media. For security issues, follow [SECURITY.md](https://github.com/zhouchangju/DeepListener/blob/main/SECURITY.md) instead of using this issue._
