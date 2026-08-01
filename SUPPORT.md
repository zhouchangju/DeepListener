# Support

DeepListener is a **solo-maintained, best-effort** self-hosted project. There is no SLA, no dedicated support channel, and no long-term support branch — only the latest `main` and the most recent release tag receive fixes.

## Project status

| Surface | Status |
| --- | --- |
| Running from source (`main`) | ✅ Supported |
| macOS Apple Silicon desktop (alpha) | ✅ Best-effort |
| Windows / Linux desktop | ❌ Planned, not shipped |
| Hosted/server deployment | ❌ Bring-your-own; the repo ships no deployment host |
| Older tags | ❌ No backports |

Transcription requires your own provider API key (OpenAI / Deepgram / Google) and is billed by that provider; DeepListener does not cover transcription costs.

## Before you file an issue

Please run through this checklist first — most reports come back to one of these:

- [ ] **Node version:** Node 20 or newer (CI runs on 20). Run `node -v`.
- [ ] **Dependencies installed:** `npm install` completed without errors.
- [ ] **Prisma client generated:** `npx prisma generate` ran after install (required before `build`/`test`).
- [ ] **FFmpeg / FFprobe on PATH:** `ffmpeg -version` and `ffprobe -version` both print a version string. A vendored copy under `vendor/ffmpeg/` is used if present.
- [ ] **Provider key configured:** copied `.env.example` to `.env` and set the key for your chosen `TRANSCRIPTION_PROVIDER`.
- [ ] **Database initialized:** `npx prisma migrate deploy` (or `migrate dev`) ran against `DATABASE_URL`.
- [ ] **Desktop alpha only:** confirmed you are on macOS Apple Silicon; Intel / Windows are not in the alpha.

For crashes or build failures, attach the **full** command output, not just the last line.

## How to report

| Report type | Where |
| --- | --- |
| 🐛 Bug | [Open a GitHub issue](https://github.com/zhouchangju/DeepListener/issues/new/choose) — use the **Bug report** template and fill every field. |
| ✨ Feature request | [Open a GitHub issue](https://github.com/zhouchangju/DeepListener/issues/new/choose) — use the **Feature request** template. |
| 🔒 Security vulnerability | See [SECURITY.md](SECURITY.md). **Do not** use public issues for security reports. |
| 💬 General question | GitHub Discussions (if enabled) or an issue labeled `question`. |

## Response expectations

This is a personal project maintained in spare time. There is **no committed response time**. Most issues are read within a few days, but complex investigations or desktop-build issues may take longer. If you can propose a fix in a pull request, that moves things fastest — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Self-hosting notes

The remote sync scripts (`npm run sync` / `npm run sync:safe`) read their target from the `SYNC_REMOTE` and `SYNC_REMOTE_BASE` environment variables; the repository ships no deployment host. Original videos under `public/videos/` are local-only and never synced. See [docs/maintenance.md](docs/maintenance.md) for the full operational manual.
