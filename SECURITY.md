# Security Policy

## Supported Versions

DeepListener is a solo-maintained, self-hostable learning application. Only the latest `main` and the
most recent tag receive fixes. There is no long-term support branch.

| Version | Supported |
| --- | --- |
| latest `main` | ✅ |
| latest tag | ✅ |
| older versions | ❌ |

## Reporting a Vulnerability

If you find a security issue, please **do not** open a public GitHub issue. Report it privately via a
GitHub Security Advisory (Repo → Security → Advisories → "Report a vulnerability"), or email the
maintainer if a private contact is listed in the profile linked from the repository.

Include:

- a description of the issue and its impact;
- minimum reproduction steps;
- the version/commit you tested.

You should receive an initial response within 7 days. Coordinated disclosure is preferred.

## Secrets and Credentials

DeepListener is designed so that **no secrets belong in the repository**:

- `.env` is gitignored and never committed. The full history has been reviewed and contains no `.env`
  file or credential values. Use `.env.example` as a template of the required variable names.
- Transcription provider keys (`DEEPGRAM_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_API_KEY`) and the
  optional `LINEAR_API_KEY` are read from the operator's local environment only and are sent only to
  their respective providers.
- The SQLite database (`dev.db` / `prisma/dev.db`) and uploaded media (`public/uploads/`,
  `public/videos/`) are gitignored and never committed.

If you believe real credentials were accidentally committed anywhere in history, treat them as
**compromised**: rotate the credential immediately, then report it as above. Do not rely on removing
the file in a new commit; rotate first.

## Media and Content Boundary

DeepListener lets operators **import their own audio and video** for personal listening practice.

- The operator is solely responsible for having the legal right to import, transcribe, and create
  derivative excerpts of any media they load into their own instance.
- DeepListener does **not** bundle, distribute, or recommend any copyrighted media. No sample media
  that could raise rights questions is committed to this repository.
- Transcription is performed by the operator's chosen provider against media the operator uploaded to
  their own instance; the provider's terms apply to that use.
- Exported audio/text notes are derived from the operator's own imported media and are intended for
  the operator's personal use.

## Deployment Topology

No host, account, or deployment path is hard-coded in the repository. The optional `npm run sync` /
`npm run sync:safe` scripts read `SYNC_REMOTE` and `SYNC_REMOTE_BASE` from the operator's environment
(see `.env.example`). Do not hard-code real deployment targets in committed files.

## What Is Out of Scope

- DeepListener is a self-hosted single-user application. It has no multi-tenant surface and no public
  deployment is operated by the project. Authentication/authorization for a multi-user or public
  deployment is the deployer's responsibility and is out of this project's scope.
- The default SQLite setup is intended for personal/single-user use.
