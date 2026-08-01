# DeepListener Sprint Contract — W1/W2 Desktop Shared Contracts & Runtime

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-002 |
| Mode | Adversarial |
| Session | `2026-07-23-desktop-w1w2` |
| Domain | Shared data/storage contracts + platform-neutral runtime implementation |
| Owner | AI Agent (integration owner) |
| Date | 2026-07-23 |
| OpenSpec change | `desktop-first-distribution` (W1 T060-T100, W2 T110-T160) |
| Baseline | HEAD post-W0: `next.config.ts` has `output:"standalone"`; W0 evidence under `docs/desktop-w0/` |

## Scope (first-principles裁剪后的关键路径)

The OpenSpec defines ~40 tasks for W1+W2. Many are over-engineered for reaching
an M1 runnable client. This sprint executes the **critical path that breaks the
cwd-coupling and enables a packaged runtime**, deferring non-blocking contracts
(settings UI, secret store, provider error taxonomy, IPC allowlist freeze) to
when they're actually needed for W3.

### In-scope files (exclusive ownership declared)

| Task | Lane | Files | Behavior |
|---|---|---|---|
| T060+T110 | A | `src/lib/runtime-paths.ts` (new), `src/lib/runtime-paths.test.ts` (new) | explicit data root + legacy fallback + layout dirs + containment |
| T111 | A | `src/lib/prisma.ts` | construct absolute DB URL from runtime-paths before client creation |
| T061+T113 | B | `src/lib/media-storage.ts` (new), tests | portable storage key + legacy URL compat + traversal rejection |
| T062+T120+T121 | B | `src/app/api/media/[...path]/route.ts` (new), tests | authenticated byte-range GET/HEAD streaming |
| T122 | B | playback URL presenter (focused callers) | keep AudioPlayer/video/WaveSurfer semantics |
| T124 | B | `src/app/api/upload/route.ts`, `src/lib/upload-policy.ts` | redirect write to data-root media |
| T125 | B | export routes (`audio/export`, `library/export`, `vault/export`) | resolve source/output via data-root |
| T112 | C | `src/lib/setup-readiness.ts`, tests | read/write distinction + explicit root |
| T140+T142 | D | `src/lib/migration-runner.ts` (new), tests | offline `migrate deploy` wrapper + pre-migration backup gate |
| T150 | E | `scripts/desktop-package.mjs` (new) | assemble standalone + static + Prisma assets |

### Out of scope (deferred — not blocking M1)

- Settings UI / secret store / provider error taxonomy (W1-B T070-T072) — `.env` still works for MVP
- IPC allowlist freeze (W1-C T081) — Electron shell reuses W0 spike contract
- Backup manifest format (W1-D T091) — simple file copy suffices for M1
- Desktop CI matrix (W1-E T096) — local build is the gate for now
- Restore conflict policy (T092/T143) — backup exists; restore is W4

## Safety boundaries (inherited from W0 + reinforced)

- `prisma/dev.db`, `public/uploads/`, `public/videos/`, `.env*`: **NO write**. 
  Runtime-paths MUST default to legacy locations when no `DEEPLISTENER_DATA_DIR`
  is set, so Server behavior is byte-identical.
- All new tests use `mktemp` data roots via `tests/fixtures/desktop/data-root-helper.ts`.
- `npm run verify` MUST stay green after every task.
- No new Prisma migration; schema is frozen.
- `package.json` deps unchanged (no Electron/Forge in project — that stays in `desktop-spike/`→`desktop/`).

## Acceptance

- [ ] `runtime-paths` resolves explicit root, legacy root, rejects invalid/unwritable
- [ ] Prisma connects to absolute DB URL from runtime-paths; Server legacy behavior unchanged
- [ ] Media upload/export write to data-root media dirs when configured
- [ ] Byte-range media route serves 200/206/416 correctly with traversal rejection
- [ ] setup-readiness distinguishes read vs write, supports explicit root
- [ ] Migration runner initializes a fresh disposable DB offline (wraps `prisma migrate deploy`)
- [ ] `npm run verify` green throughout
- [ ] Protected data unchanged (sha256 recheck at end)
