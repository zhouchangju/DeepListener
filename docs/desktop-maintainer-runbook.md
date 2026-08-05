# DeepListener Desktop — Maintainer Runbook (T251)

## Prerequisites

- macOS 15+ on Apple Silicon machine
- Node.js 22+ and npm
- Xcode Command Line Tools (`xcode-select --install`)

An Apple Developer account is only required for a signed/notarized public
release. It is not required for the internal unsigned alpha build.

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
# Contains: server.js, .next/static, prisma/migrations, Prisma engine, and a
# redacted `runtime-manifest.json`; a verified FFmpeg pair additionally creates
# `runtime/assets.manifest.json`.
```

Before a public desktop build, run the fail-closed preflight:

```bash
npm run desktop:preflight
```

For an internal unsigned alpha on a maintainer machine, the explicit escape
hatch permits the current system FFmpeg and synthetic demo. The machine must
still expose both `ffmpeg` and `ffprobe` on `PATH`:

```bash
npm run desktop:preflight -- --allow-system-ffmpeg --allow-synthetic-demo
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

The maintained distribution entry point is `npm run desktop:dist`. Add
`--dir --alpha` for an unpacked internal alpha; without `--alpha`, preflight
rejects system-only FFmpeg and the synthetic demo before packaging.

## Repair a pre-Desktop database

Some development databases already contain the current `ReviewItem` columns
but predate the Desktop runner's `_deeplistener_migrations` tracking table.
The repair command is dry-run by default and requires an explicit absolute
database path. Review its plan, then opt into a verified backup and baseline:

```bash
npm run db:repair-legacy -- --db /absolute/path/to/database.db
npm run db:repair-legacy -- --db /absolute/path/to/database.db --apply --yes
```

Never point this at a protected database without first reviewing the backup
location and output. The command does not run automatically at app startup.

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

1. `npm run verify` is green (lint + 447 tests, with only documented environment-limited skips + build)
2. `npm run desktop:package` succeeds
3. `npm run desktop:preflight` passes without alpha escape hatches
4. Package-content audit passes (T011/T151)
5. Unsigned package launches on a clean macOS profile:
   - Demo path works (no crash, demo audio loads)
   - Settings / provider configuration accessible
   - Import a small audio file → practice → vault → restart → data persists
6. (Signed release only) `spctl` gate passes; notarization confirmed
7. Tag the commit: `git tag v0.x.0 && git push --tags`
8. Attach signed `.dmg` to GitHub release
9. Update update-manifest.json on the release host

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
| `scripts/repair-legacy-db.mjs` | Explicit, backup-first legacy DB baseline tool |
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
- Windows x64 support claim (platform adapter contract exists; native installer/runtime evidence is still required)
- Auto-updater (requires release hosting + signing strategy)
- Bundled LGPL FFmpeg binary (requires self-build pipeline — see below)
- User validation sessions (5 real learners)

## Vendoring FFmpeg (T181, unblocks FR-041/DMR-002)

The repository currently contains no redistributable FFmpeg assets. For a fully
self-contained app, a maintainer must clear OPEN-001..005 in
`docs/desktop-w0/ffmpeg-provenance.md` and drop binaries in `vendor/ffmpeg/`.

### Quick path (LGPL-licensed static build, darwin-arm64)

```bash
# 1. Acquire a darwin-arm64 static FFmpeg build that is LGPL-compatible.
#    Two options:
#      (a) self-build from a pinned FFmpeg + LAME release with --enable-gpl
#          DISABLED (see ffmpeg-provenance.md §3.6 for the configure flags);
#      (b) use a vetted third-party static build whose license permits
#          redistribution — verify the source yourself before committing.
#
# 2. Place the binaries (must be executable) in a target-specific directory:
mkdir -p vendor/ffmpeg/darwin-arm64
cp <ffmpeg-binary>  vendor/ffmpeg/darwin-arm64/ffmpeg
cp <ffprobe-binary> vendor/ffmpeg/darwin-arm64/ffprobe
chmod +x vendor/ffmpeg/darwin-arm64/ffmpeg vendor/ffmpeg/darwin-arm64/ffprobe

# 3. Add reviewed metadata alongside the pair:
#    vendor/ffmpeg/darwin-arm64/assets.json
#    (license, source, version, capabilities, and redistribution evidence)

# 4. The packager computes SHA-256 checksums and emits
#    runtime/assets.manifest.json only after assets.json and both binaries pass.

# 5. Add the NOTICE/LICENSE text required by FFmpeg's LGPL redistribution
#    terms (corresponding-source offer URL, attribution). See
#    docs/desktop-w0/ffmpeg-provenance.md §3.6.

# 6. Rebuild the package and verify the packaged resolver uses explicit paths:
npm run desktop:package
node -e "const m=require('./.desktop-build/standalone/runtime/assets.manifest.json'); console.log(m.platform,m.architecture)"
#    Then run the packaged startup/media smoke on the target OS.
```

### Why packaged FFmpeg is fail-closed

Packaged Desktop resolves FFmpeg only after checking the target-specific
manifest, file existence, capability floor, license metadata, and checksums.
Missing or tampered assets set an explicit limited state and do not silently
fall back to a user's PATH. Server/dev mode may still use an explicit system
configuration for maintainer workflows.

### Verifying in the packaged app

After `npm run desktop:dist`, open the `.app` bundle and confirm:

```bash
APP="path/to/DeepListener.app"
ls "$APP/Contents/Resources/ffmpeg/"        # should list ffmpeg + ffprobe
"$APP/Contents/Resources/ffmpeg/ffmpeg" -version | head -1
```

If the directory or manifest is missing, the public preflight must fail before
an artifact is presented as a learner release.
