# T050 — W0 Feasibility Decision Gate

| Field | Value |
|---|---|
| Req | all W0 evidence; proposal stop condition |
| Deps | T001, T014, T023, T033, T041, T042 |
| Decision | **PROCEED to W1** (with two documented packaging requirements carried forward) |
| Date | 2026-07-22 |
| Gate owner | W0 integration owner |

## Lane verdicts

### W0-A — Next standalone + Prisma → **PASS** (T014)

| Question | Answer |
|---|---|
| Standalone runs detached from repo + full node_modules? | **Yes** — launched from `mktemp`, served routes on 127.0.0.1 only. |
| Packaged Prisma engine loads + connects to explicit DB? | **Yes** — `libquery_engine-darwin-arm64.dylib.node` worked from standalone. |
| CRUD on disposable SQLite? | **Yes** — CREATE/READ/UPDATE/DELETE + cascade. |
| Read-only DB detected? | **Yes** — write rejected with catchable error. |
| Migration runner selected? | **Yes** — bundled `prisma migrate deploy` (idempotent, proven); `db push` rejected. |

### W0-B — FFmpeg / media assets → **PASS with open item** (T023)

| Question | Answer |
|---|---|
| Required operations/codecs mapped? | **Yes** — 9 call sites → 6 operations; only libmp3lame encode needed (no video encode). |
| Redistributable source selected? | **Conditionally** — recommended self-built minimal LGPL FFmpeg; evermeet/BtbN have no darwin-arm64 LGPL build. |
| License clearance? | **LGPL viable** (LAME is LGPL-2.1; no GPL codec used) — but gated on maintainer sign-off + build pipeline (OPEN-001..005 → W3-B T181). |
| Packaged-path ops validated? | **Invocation contract proven** with system ffmpeg; production packaged-path pending cleared binary. |
| Manifest schema defined? | **Yes** — accepts darwin-arm64, rejects wrong arch/checksum/missing. |

### W0-C — Electron shell + security → **PASS** (T033)

| Question | Answer |
|---|---|
| Electron manages loopback service, random port, single-instance, health, cleanup? | **Yes** — all verified in a real headless launch. |
| Per-launch authorization? | **Yes** — 256-bit token, injected via env, constant-time compared, never persisted/returned. |
| Renderer sandboxed (nodeIntegration=false, contextIsolation=true, sandbox=true)? | **Yes** — verified live: process/require/module all unavailable. |
| Navigation/CSP/permission/IPC restricted? | **Yes** — navigation denied, new-window denied, CSP applied, permissions restricted, no generic IPC. |
| Token absent from logs/diagnostics/responses? | **Yes**. |

### W0-D — Demo + usability → **PASS** (design only)

| Question | Answer |
|---|---|
| Legal demo path without provider key? | **Yes** — author-owned original clip (fallback: permissive TTS); no provider call. |
| Usability protocol distinguishes build success from user completion? | **Yes** — DFS-006 rule enforced at observation time. |
| Demo isolation/removal model? | **Yes** — `Track.trackType="DEMO"` flag reuses existing column (no schema migration, respects W0 freeze). |

## Strongest case AGAINST Electron (red-team)

The three most serious objections, and how the W0 evidence answers each:

1. **"Electron is heavy and the packaging burden will consume the whole
   maintenance budget."**
   *Evidence:* The standalone + Prisma dimension is **not** a rewrite — the
   existing app runs from a `mktemp` bundle unchanged. The real packaging
   cost is bounded and now itemized: copy `.next/static`, bundle the Prisma
   schema-engine, build one LGPL FFmpeg, ship one Electron runtime. None of
   these is an open-ended backend rewrite (the design's stated stop
   condition). *Residual risk:* the FFmpeg self-build pipeline (OPEN-001..005)
   is real work and is correctly gated to W3-B, not W1.

2. **"Security will be weakened for convenience."**
   *Evidence:* W0-C proved the opposite can be enforced and **tested**. Every
   release-blocking security setting (nodeIntegration/contextIsolation/
   sandbox/CSP/navigation/permission/IPC) is asserted both by source audit and
   by a live renderer probe that confirms Node primitives are unavailable. The
   per-launch token never reaches the renderer. *Residual risk:* the
   authorization middleware must actually be wired into the standalone
   service's privileged endpoints (W2-C/T132, W3-A/T173); the spike proved the
   contract, not the integration.

3. **"Docker/self-host would be materially cheaper and the audience may be
   developers anyway."**
   *Evidence:* This is the **one objection W0 cannot settle with a spike** —
   it is a product-adoption question, not a technical-feasibility question.
   W0-D produced the usability protocol (T041) precisely to answer it in W4,
   not now. The technical feasibility gate does not require the adoption
   question to be resolved; it requires that proceeding to W1 not be blocked
   by an invalid architecture. The architecture is valid.

   *Decision rule (from PRD §13):* if W4 user evidence shows the audience is
   predominantly developers satisfied with Docker, Desktop narrows to an
   experiment. That is a W4 decision, not a W0 one.

## Decision: PROCEED to W1

All four W0 lanes passed their feasibility verdicts. No design stop condition
triggered. The assumed low-rewrite Electron path (AD-001/AD-002) is validated
by executable evidence on macOS Apple Silicon. W1 (freeze shared contracts)
may begin.

### Two packaging requirements carried into W1/W2/W3

These are concrete additions to the task graph, not blockers:

1. **`.next/static` must be copied** by the packager into the standalone
   bundle (Next does not trace it). → flows into T150 (productionize
   standalone build script) and the package-content audit (T011/T151).
2. **The Prisma schema-engine binary** must be bundled alongside the query
   engine for `migrate deploy` (T013 selection). → flows into T180 (package
   darwin-arm64 Prisma runtime) and the audit (T011/T151).

### Open items tracked but NOT blocking W1

- **OD-003 / FFmpeg:** self-built minimal LGPL binary pending maintainer
  sign-off + build pipeline (W3-B T181). W0-B selected the approach and
  proved the license is viable; the binary is not needed until W3-B.
- **OD-005 / demo media:** author-owned original clip recommended; provenance
  recorded at packaging (T191).
- **Demo isolation:** `Track.trackType="DEMO"` reuses the existing nullable
  column — no schema change, so W1-D migration design is unaffected.

## Entry conditions for W1 (met)

- [x] W0-A verdict: PASS (standalone + Prisma proven)
- [x] W0-B verdict: PASS (FFmpeg approach selected, license viable)
- [x] W0-C verdict: PASS (Electron security proven)
- [x] W0-D verdict: PASS (demo + usability protocol defined)
- [x] `npm run verify` green at HEAD with the additive `output:"standalone"`
- [x] Protected data unchanged (sha256 match, counts match)
- [x] No orphan processes; temp dirs cleaned

## Verification commands run this session

```bash
# baseline + gate
npm run verify:quick          # 198 pass / 0 fail
npm run verify                # lint + test:ci + build, exit 0
git diff --check              # whitespace OK

# W0-A
node docs/desktop-w0/standalone/package-content-audit.test.mjs   # 3 pass
node docs/desktop-w0/prisma-spike/t012-prisma-crud-spike.mjs     # CRUD + RO pass
node docs/desktop-w0/standalone/package-content-audit.mjs .next/standalone  # exit 1 (missing static — expected)
prisma migrate deploy (against disposable DB)                    # 15 migrations, idempotent

# W0-B (background agent)
# T020 inventory, T021 LGPL memo, T022 invocation contract (system ffmpeg), T023 schema validator

# W0-C
node desktop-spike/verify-spike.mjs                             # 27 assertions pass
node --import tsx --test desktop-spike/t031-auth-contract.test.ts # 6 pass
electron desktop-spike/main-probe.js (headless)                 # 8 renderer assertions pass
electron desktop-spike/. (headless full lifecycle)              # healthy, clean shutdown

# W0-D (background agent)
# T040 demo script, T041 usability protocol, T042 isolation contract
```

## Protected-data integrity (final)

| Resource | Baseline | After W0 | Match |
|---|---|---|---|
| `prisma/dev.db` sha256 | `c5183268…a08b1d` | `c5183268…a08b1d` | ✅ |
| `prisma/dev.db` mtime | 2026-07-13 13:10 | 2026-07-13 13:10 | ✅ |
| `public/uploads/` (`ls -A`) | 232 | 232 | ✅ |
| `public/videos/` (`ls -A`) | 2 | 2 | ✅ |
| `prisma/schema.prisma` | tracked, unchanged | unchanged | ✅ |
| `prisma/migrations/` | 17 entries | 17 entries | ✅ |
| `.env*` | not read | not read | ✅ |

## Files actually modified or created by this session

**Modified (tracked source — 1 file, AUTH-001):**
- `next.config.ts` — added `output: "standalone"` (additive, reversible; verify green).

**Created (untracked — W0 artifacts):**
- `docs/agent-harness/sessions/2026-07-22-desktop-feasibility/` — contract, safety profile, evaluator report, this T050 report.
- `docs/desktop-w0/` — baseline, T010–T014 reports, migration-runner decision, ffmpeg-inventory/provenance/spike/manifest (W0-B), demo-script/usability-protocol/demo-isolation (W0-D).
- `tests/fixtures/desktop/` — generated media, DB fixtures, data-root helper + test, provenance.
- `desktop-spike/` — disposable Electron spike (main/preload/probe/verify/auth-test); `node_modules` to be removed at W0 close.

**Not touched:** `prisma/dev.db`, `public/uploads/`, `public/videos/`, `.env*`, `prisma/schema.prisma`, `prisma/migrations/`, `package.json`, `package-lock.json`, and all pre-existing dirty-tree edits (onboarding / open-source / desktop-openspec).
