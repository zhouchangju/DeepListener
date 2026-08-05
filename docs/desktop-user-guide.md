# DeepListener Desktop — User Guide (T250)

## Supported platforms

| Platform | Status |
|---|---|
| macOS Apple Silicon (M1/M2/M3/M4) | Internal unsigned alpha only; public support not claimed |
| macOS Intel | Not verified |
| Windows x64 packaged client | Not shipped; run the supported Server edition from source |
| Linux | Not supported |

The repository currently has no signed public Desktop release. The packaged
Desktop client currently supports macOS Apple Silicon only. Windows users should
run the supported Server edition from source; it requires Node.js 22+, Prisma
setup, FFmpeg/ffprobe, and any provider key needed for transcription.

## Installation

When a signed release is published, download its `.dmg` from the releases page
and drag DeepListener.app to Applications. **No Node.js, npm, or terminal is
required for that intended packaged path** — the app is designed to bundle its
own runtime.

The current maintainer artifact is an unsigned internal arm64 alpha. A DMG built
from the current source has not yet been published. A public DMG still requires
Apple signing/notarization, redistributable FFmpeg assets, and a clean-install
verification run; those gates are intentionally open.

> **Media import note:** Public Desktop packaging is fail-closed until a
> checksum-verified, redistributable FFmpeg/ffprobe pair and provenance are
> supplied. Development/server runs may use an explicitly configured system
> FFmpeg, but that is not a supported learner installation workaround.

## Where your data lives

All your data (database, imported media, exports, backups, logs, settings) lives
under your macOS user data directory:

```
~/Library/Application Support/DeepListener/
├── database/
│   └── deeplistener.db       (your learning history)
├── media/
│   ├── audio/                (imported audio)
│   ├── video/                (imported video)
│   └── temp/                 (transient import files)
├── exports/                  (generated exports)
├── backups/                  (automatic + manual backups)
├── logs/
├── settings/
│   └── settings.json
└── runtime/
```

**Uninstalling the app does NOT delete this data.** If you want to remove
everything, manually delete `~/Library/Application Support/DeepListener/`.

## Privacy boundary

- Your media and learning data stay on your computer. DeepListener does not
  send your audio, transcripts, notes, or review history to any server.
- When you configure a transcription provider (OpenAI / Deepgram / Google),
  only the audio you choose to transcribe is sent to that provider. The demo
  path does not contact any provider.
- No telemetry is collected by default. Diagnostic export is user-initiated and
  redacted by default (no credentials, no transcripts, no raw data).

## Quick start: Try the demo

1. Launch DeepListener.
2. Choose **"Try the demo"**.
3. Listen to the demo audio blind (no visuals).
4. Reveal and navigate the sentences.
5. Capture one sentence to your Vault.
6. See where it continues in Review.

No API key is required for the demo. The bundled clip contains six short
spoken-English sentences and is generated from a locally runnable Piper voice
model with redistribution provenance recorded in `public/demo/PROVENANCE.md`.

## Adding your own media

1. Go to **Setup** and select a transcription provider (OpenAI, Deepgram, or
   Google). Deepgram is the current local default; the public recommendation
   policy remains subject to product approval.
2. Enter your API key. In the packaged macOS Desktop app it is stored in one
   macOS Keychain item; Server/dev runs use an access-restricted file under
   the DeepListener data directory. The key is never displayed after entry.
3. Optionally run a **connection test** to verify the key works.
4. Import audio (mp3, wav, m4a, etc.) or video (mp4, webm) from the Library.
   If the video contains embedded subtitles, they're used automatically
   without contacting a provider.

> **Don't have an API key yet?** DeepListener needs a key from the provider
> you chose; transcription is billed by that provider, not by DeepListener.
> The same steps are also shown inside the app on the **Settings → Configure**
> dialog ("How do I get a key?").
>
> **Deepgram (default)** — https://console.deepgram.com/
> 1. Sign up at console.deepgram.com.
> 2. New accounts usually receive free credit; check the Dashboard.
> 3. Go to **API Keys** and click **Create API Key**.
> 4. Copy the generated key and paste it into the API key field in Settings.
>
> **OpenAI (Whisper)** — https://platform.openai.com/api-keys
> 1. Sign up and sign in at platform.openai.com.
> 2. Add a payment method under **Settings → Billing** (Whisper is
>    pay-as-you-go).
> 3. Go to **API Keys** and click **Create new secret key**.
> 4. Copy the generated key (starts with `sk-`) and paste it into Settings.
>    Access from mainland China may require a proxy.
>
> **Google (Gemini)** — https://aistudio.google.com/app/apikey
> 1. Sign in with a Google account at aistudio.google.com.
> 2. Accept the terms, then create a key on the **Get API Key** page.
> 3. Copy the generated API key and paste it into Settings. Some regions may
>    need a proxy to reach Google.

## Backup and restore

- Create a complete backup from **Setup → Data safety**. The backup includes
  your database, media files, and a manifest with version + integrity info.
- Restore from a backup when you recover from a problem; confirmation is
  required before existing data is replaced and a rollback copy is retained.
- Cross-platform restore is designed but not yet proven by native macOS and
  Windows release evidence.

## Upgrading

An automatic updater is not shipped yet. Before a manually installed upgrade,
create a verified backup. The migration runner backs up existing data before a
schema-changing migration and blocks activation if the backup or migration
fails.

## Recovery

If the app fails to start:
- A diagnostic screen offers retry, diagnostics, and quit.
- Diagnostics export a redacted bundle you can share (no secrets or private
  media are included).

## Known limitations

- No cloud sync or multi-device support.
- No mobile / tablet app.
- Provider transcription requires an internet connection and an API key from
  OpenAI, Deepgram, or Google.
- Large video imports (up to 1 GB) may take time; the app shows stage-aware
  progress (copying → probing → extracting → transcribing → indexing).

## Getting help

Issues and feedback: [GitHub issues](https://github.com/zhouchangju/DeepListener/issues)
