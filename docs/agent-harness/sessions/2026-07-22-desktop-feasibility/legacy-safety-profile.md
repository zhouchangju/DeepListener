# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | `2026-07-22-desktop-feasibility` |
| Mode | Adversarial |
| Owner | AI Agent (W0 feasibility executor) |
| Date | 2026-07-22 |
| Wave | W0 — Feasibility and Decision Evidence |
| OpenSpec change | `desktop-first-distribution` |

## Protected Data — Baseline Captured at Session Start

These are read-only snapshots captured **before** any W0 spike ran. They are the
non-repudiation baseline for the T050 final report.

| ID | Path / Resource | Status Before (frozen) | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists, 47337472 bytes, sha256 `c5183268809cd4577e083c618a93195c7b7b2cd65c4b37f6863b4efdc9a08b1d`, mtime 2026-07-13 13:10 | **NO access.** Not read, not migrated, not copied, not touched. | any byte change, `mtime` change, migration, `db push`, delete, or sync |
| DATA-SAFE-002 | `public/uploads/` | exists, 231 entries (incl. `.gitkeep`), oldest user audio present | **NO write/delete/sync.** Read-only directory listing only. | any write, rename, delete, move, or `npm run sync*` |
| DATA-SAFE-003 | `public/videos/` | exists, 1 original video `4c190457-…mp4` (122699138 bytes) + `.gitkeep` | **NO write/delete/commit/sync.** Read-only listing only. | any write, delete, commit, or sync |
| DATA-SAFE-004 | `.env` and `.env*` | `.env` and `.env.example` exist; values never read | **NO read, edit, or print of values.** | any read of secret values, edit, or source into spike env |
| DATA-SAFE-005 | `prisma/migrations/**` | 14 migrations + `migration_lock.toml` (sqlite) | **NO create/edit/delete.** Migrations are read-only inputs. | any new migration file, edit, or delete |
| DATA-SAFE-006 | `prisma/schema.prisma` | current model set, `prisma-client-js` generator, sqlite datasource | **NO edit.** Schema is a frozen input for W0. | any edit to generator/datasource/models |
| DATA-SAFE-007 | working-tree pre-existing changes | onboarding + open-source + desktop-openspec docs already uncommitted at HEAD `960ec85` | **PRESERVE.** Never `reset`/`checkout`/`clean`/`stash-drop`. | any rollback, revert, or overwrite of others' edits |

### Baseline verification commands (re-run at T050)

```bash
# dev.db integrity (byte + sha must match the frozen row above)
ls -la prisma/dev.db && shasum -a 256 prisma/dev.db
# uploads/videos unchanged (use -A so .gitkeep is counted deterministically)
ls -A public/uploads/ | wc -l   # expect 232
ls -A public/videos/ | wc -l    # expect 2
# protected files unchanged
git status --short prisma/schema.prisma prisma/migrations .env .env.example
# no migration files added (14 migrations + migration_lock.toml; .DS_Store is pre-existing noise)
ls -A prisma/migrations/ | wc -l # expect 17
```

## Disposable Test Roots — Only Allowed Write Targets

W0 spikes write **only** to these disposable locations:

| ID | Path | Purpose | Owner |
|---|---|---|---|
| WRITE-001 | `$(mktemp -d -t deeplistener-w0-*)` | standalone launch, disposable SQLite, Prisma read/write integration | every spike; created fresh per run |
| WRITE-002 | `tests/fixtures/desktop/**` (new, gitignored from active data) | tiny generated/owned media + corrupt SQLite fixtures | T002 owner |
| WRITE-003 | `desktop-spike/**` (new) | disposable Electron/Forge spike source; NOT production integration | T030–T033 owner |
| WRITE-004 | `docs/agent-harness/sessions/2026-07-22-desktop-feasibility/**` | this contract + evidence | integration owner |
| WRITE-005 | `docs/desktop-w0/**` (new) | W0 spike notes/manifests/provenance (docs only) | lane owners |

All other writes require a new contract amendment. Spikes MUST derive every
path from an explicit `mktemp` root or the W4 docs dir — never from the repo
runtime, never from `process.cwd()`-relative `prisma/dev.db`, never from
`public/uploads`.

## Stop Conditions (any one halts W0 and forces escalation)

1. Any byte change, `mtime` change, migration, `db push`, delete, or sync of
   `prisma/dev.db`.
2. Any write/delete/move/commit/sync to `public/uploads/` or `public/videos/`.
3. Any read/edit/print of `.env*` secret values.
4. Any new Prisma migration file, schema edit, or generator change.
5. Any `npm install` of Electron/Forge or other runtime dependency into the
   project `package.json` / `node_modules` without explicit user authority
   (W0 may use a *separate* throwaway project dir for Electron spikes).
6. Any weakening of `lint`, `test`, `test:ci`, `build`, or CI config.
7. Any attempt to enable `nodeIntegration`, disable `contextIsolation`, disable
   sandbox, or open unrestricted IPC/navigation in a renderer.
8. Any external publish: installer, GitHub Release, update manifest, remote
   artifact, signing certificate, API key, or Git token.
9. Any `npm run sync` or `npm run sync:safe`.
10. Any modification of pre-existing onboarding / open-source / desktop-openspec
    edits in the dirty worktree.

## Rollback

| Area | Rollback Path | Data Safety Notes |
|---|---|---|
| Disposable temp roots | `rm -rf` the `mktemp` dir + kill spawned processes | no active data impact; verify no orphan Node/Electron PID |
| `desktop-spike/**`, `tests/fixtures/desktop/**`, `docs/desktop-w0/**` | `git clean -fdx <path>` or `rm -rf` (these are untracked) | no impact on tracked source or protected data |
| OpenSpec `proposal/design/specs/tasks` edits | revert only the hunks this session added; preserve prior desktop-openspec content | never roll back the frozen planning baseline |
| Protected data | **N/A — no write authorized** | if baseline verification fails, escalate immediately; do not self-heal |

## Parallel-Worker Coordination Rules

When more than one W0 lane runs concurrently, each worker MUST:

1. Own a disjoint file set (declared per task below).
2. Be told that the worktree contains other uncommitted edits (onboarding,
   open-source, desktop-openspec) and that those edits are untouchable.
3. Integrate only against frozen contracts in
   `openspec/changes/desktop-first-distribution/**`.
4. Never edit a file owned by another lane in the same wave.
5. Record its own verification evidence in this session dir before claiming done.
