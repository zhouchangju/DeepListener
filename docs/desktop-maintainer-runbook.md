# DeepListener Desktop — Maintainer Runbook (T251)

## Prerequisites

- macOS 15+ on Apple Silicon machine
- Node.js 24+ and npm
- Apple Developer account (for signing / notarization)
- Xcode Command Line Tools (`xcode-select --install`)

## Development setup

```bash
git clone https://github.com/deeplistener/deeplistener.git
cd deeplistener
npm install
npx prisma generate
npm run verify          # lint + tests + build — must be green
```

## Build the standalone service bundle

```bash
npm run desktop:package
# Output: .desktop-build/standalone/
# Contains: server.js, .next/static, prisma/migrations, Prisma engine, runtime-manifest.json
```

## Build the Electron desktop shell

```bash
cd desktop
npm install
npm start              # dev mode, loads from .desktop-build/standalone
npm run start:dev      # with explicit standalone path
```

## Native macOS packaging

### Unsigned build (development / M1 milestone)

```bash
npm run desktop:package
cd desktop
npm install electron-forge --save-dev
npx electron-forge make --platform=darwin --arch=arm64
# Output: out/make/DeepListener-*.zip (unsigned)
```

### Signed and notarized build (M2 milestone)

Requires:
- Apple Developer ID Application certificate in Keychain
- App Store Connect API key for notarization

```bash
# place forge.config.js with osxSign + osxNotarize options
# (certificate name, team ID, api key path — values are secret, never committed)
npx electron-forge make --platform=darwin --arch=arm64
```

## Package content audit

```bash
# The audit asserts required runtime assets are present.
npx tsx docs/desktop-w0/standalone/package-content-audit.mjs .desktop-build/standalone

# On a signed build, also verify:
spctl -a -t exec -vvv out/make/DeepListener.app
codesign -dvvv out/make/DeepListener.app
```

## Release checklist

1. `npm run verify` is green (lint + 266+ tests + build)
2. `npm run desktop:package` succeeds
3. Package-content audit passes (T011/T151)
4. Unsigned package launches on a clean macOS profile:
   - Demo path works (no crash, demo audio loads)
   - Settings / provider configuration accessible
   - Import a small audio file → practice → vault → restart → data persists
5. (Signed release only) `spctl` gate passes; notarization confirmed
6. Tag the commit: `git tag v0.x.0 && git push --tags`
7. Attach signed `.dmg` to GitHub release
8. Update update-manifest.json on the release host

## Data safety during development

- `prisma/dev.db` is the maintainer's **real learning data**. Never run
  migrations, `db push`, `prisma migrate deploy`, or any write against it
  during development. Use disposable `mktemp` DBs with `DEEPLISTENER_DATA_DIR`.
- `public/uploads/` and `public/videos/` are real user media. Never delete or
  sync without explicit intention.
- `.env*` files contain real secret values. Never commit or share.

## Directory reference

| Path | Purpose |
|---|---|
| `src/lib/runtime-paths.ts` | Single source of data-root resolution (Desktop vs legacy Server) |
| `src/lib/prisma.ts` | Prisma client singleton; Desktop overrides DATABASE_URL from runtime-paths |
| `src/lib/migration-runner.ts` | Offline `node:sqlite` migration runner (T140) |
| `src/lib/media-storage.ts` | Portable media URL → path resolver |
| `src/app/api/media/[...path]/route.ts` | Byte-range media streaming (206/416/200) |
| `src/lib/demo-seed.ts` | Idempotent demo track seeder + remover |
| `src/app/api/demo/route.ts` | Demo seeding API (GET/POST/DELETE) |
| `scripts/desktop-package.mjs` | Standalone bundle packager |
| `desktop/main.js` | Electron main process (sandboxed lifecycle) |
| `desktop/preload.js` | Narrow IPC bridge |
| `docs/desktop-client-prd.md` | Product requirements |
| `docs/desktop-user-guide.md` | End-user documentation |
| `docs/desktop-maintainer-runbook.md` | This document |

## Not yet implemented (requires user authority or external resources)

- macOS signing/notarization (Apple Developer certificate)
- Windows x64 support (platform adapter + binaries + installer)
- Auto-updater (requires release hosting + signing strategy)
- Bundled LGPL FFmpeg binary (requires self-build pipeline)
- User validation sessions (5 real learners)
