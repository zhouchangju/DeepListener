# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-05-demo-spoken-audio |
| Domain | Audio / Release Asset |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Replace the offline Demo busy tone with real English speech | `public/demo/demo-listening.mp3`, `src/lib/demo-seed.ts` | First-session blind listening plays six spoken-English sentences without a provider key |
| FEAT-002 | Preserve source/licensing evidence and audio integrity | `public/demo/PROVENANCE.md` | Duration, source, license and SHA-256 are recorded |
| FEAT-003 | Keep the maintainer replacement path compatible with installed FFmpeg | `scripts/replace-demo-audio.mjs` | `ffprobe` duration validation succeeds on FFmpeg 9 |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Vendor platform FFmpeg/ffprobe binaries | Separate desktop release-asset sprint |
| OOS-002 | Prisma data, uploads, provider credentials, or UI changes | Protected data and unrelated domains |

## Preserve / Change / Verify

### Preserve

| ID | Existing Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | `/demo/demo-listening.mp3`, `demo-listening-001`, `trackType = DEMO` remain stable | seed tests and source inspection |
| AC-PRESERVE-002 | Demo remains provider-free and idempotent | `src/lib/demo-seed.test.ts` |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Audio is spoken English rather than a tone | bundled MP3 metadata, non-synthetic provenance, manual playback-ready file |
| AC-CHANGE-002 | Six cues align to the clip within the script tolerance | replacement script validation and seed source |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/demo-seed.test.ts src/lib/desktop-packaging-contract.test.ts` | targeted regression | yes | exits 0 |
| `npm run test:ci` | broader tests | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | production build | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/practice/demo-listening-001?demo=1` | Seed/open Demo, start blind listening, play the bundled audio | Audio loads from the stable URL; six cue boundaries remain usable |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Rights/source evidence missing | Stop and do not ship the asset |

## Rollback

| Area | Rollback |
|---|---|
| Code/assets/docs | Restore the recorded temp backup or revert this scoped change |
| Data | N/A |
| Deploy | N/A |
