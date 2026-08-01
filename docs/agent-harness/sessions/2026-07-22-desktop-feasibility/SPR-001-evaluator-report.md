# SPR-001 Evaluator Report — W0 Desktop Feasibility

Date: 2026-07-22
Mode: Adversarial
Result: **PASS — T050 decision: PROCEED to W1**
OpenSpec change: `desktop-first-distribution`

## Task Completion Log

| Task | Lane | Status | Verification Evidence |
|---|---|---|---|
| T000 | W0-G | ✅ done | `SPR-001-contract.md` + `legacy-safety-profile.md`; no active data path writable |
| T001 | W0-E | ✅ done | `docs/desktop-w0/baseline.md` — `npm run verify` green at HEAD 960ec85 (198 tests); route/path inventory |
| T002 | W0-E | ✅ done | `tests/fixtures/desktop/**` + `data-root-helper.test.ts` (3 pass); provenance recorded; dev.db sha unchanged |
| T010 | W0-A | ✅ done | `T010-standalone-spike-report.md` — launched from mktemp on 127.0.0.1; `/`,`/setup`,`/library`,`/api/*` HTTP 200 |
| T011 | W0-A | ✅ done | `package-content-audit.{mjs,test.mjs}` — 3 mutation tests pass; real-build audit exit 1 (missing `.next/static`, expected) |
| T012 | W0-A | ✅ done | `t012-prisma-crud-spike.mjs` + `T012-prisma-crud-report.md` — CRUD+cascade pass; read-only DB rejected |
| T013 | W0-A | ✅ done | `migration-runner.md` — `prisma migrate deploy` selected (15 migrations, idempotent); `db push` rejected |
| T014 | W0-A | ✅ done | `T014-standalone-prisma-verdict.md` — PASS, no stop condition |
| T020 | W0-B | ✅ done | `ffmpeg-inventory.md` — 9 call sites → 6 ops; libmp3lame only encode needed |
| T021 | W0-B | ✅ done | `ffmpeg-provenance.md` — self-built minimal LGPL recommended; evermeet/BtbN lack darwin-arm64 LGPL |
| T022 | W0-B | ✅ done | `ffmpeg-spike.md` — invocation contract proven (system ffmpeg); packaged-path pending cleared binary (W3-B) |
| T023 | W0-B | ✅ done | `runtime-asset-manifest.md` — schema accepts darwin-arm64, rejects wrong arch/checksum |
| T030 | W0-C | ✅ done | `desktop-spike/main.js` + `verify-spike.mjs` (27 assertions) + headless launch (healthy, clean shutdown) |
| T031 | W0-C | ✅ done | `t031-auth-contract.test.ts` (6 pass) — 256-bit token, missing/wrong rejected, never in response |
| T032 | W0-C | ✅ done | `main-probe.js` + `security-probe.html` (8 live assertions) — Node off, IPC narrow, CSP/nav/perm restricted |
| T033 | W0-C | ✅ done | `T033-electron-security-verdict.md` — PASS, no stop condition |
| T040 | W0-D | ✅ done | `demo-script.md` — author-owned clip; no provider call; provenance explicit |
| T041 | W0-D | ✅ done | `usability-protocol.md` — distinguishes build success from user completion |
| T042 | W0-D | ✅ done | `demo-isolation.md` — `Track.trackType="DEMO"`, no schema migration |
| T050 | W0-I | ✅ done | `T050-feasibility-decision.md` — **PROCEED to W1** |

## Lane Verdicts

### W0-A — Next standalone + Prisma: **PASS**
- Standalone launches detached from repo on loopback (T010).
- Packaged Prisma engine + CRUD on disposable SQLite (T012); read-only detected.
- `prisma migrate deploy` selected, idempotent (T013); `db push` rejected.
- Surfaced 2 packaging reqs: copy `.next/static`; bundle schema-engine.

### W0-B — FFmpeg / media assets: **PASS with tracked open item**
- LGPL path viable (LAME is LGPL; no GPL codec used).
- Self-built minimal LGPL binary recommended; gated to W3-B T181.
- Manifest schema complete (T023).

### W0-C — Electron shell + security: **PASS**
- Single-instance, dynamic loopback port, health wait, graceful shutdown (T030).
- Per-launch 256-bit token, constant-time compare, never persisted/returned (T031).
- Renderer sandbox verified live: Node off, narrow IPC, CSP/nav/perm restricted (T032/T033).

### W0-D — Demo + usability: **PASS (design)**
- Author-owned demo, no provider call (T040).
- Usability protocol enforces "build ≠ adoption" (T041).
- `trackType="DEMO"` isolation, no schema change (T042).

## Strongest Case Against Electron (red-team)

1. **Packaging burden** — answered: bounded, itemized (2 packaging reqs); not a rewrite.
2. **Security weakening** — answered: every release-blocking setting asserted live.
3. **Docker may suffice / audience may be developers** — **not a W0 question**; deferred to W4 user evidence (T041 protocol ready). Technical feasibility does not require resolving adoption now.

## T050 Decision

**PROCEED to W1.** All W0 lanes passed; no stop condition triggered; `npm run
verify` green; protected data unchanged. W1 (freeze shared contracts) may
begin, carrying the two packaging requirements into W2/W3.

## Protected-Data Integrity (final)

| Resource | Baseline | After W0 | Match |
|---|---|---|---|
| `prisma/dev.db` sha256 | c5183268…a08b1d | c5183268…a08b1d | ✅ |
| `prisma/dev.db` mtime | 2026-07-13 13:10 | 2026-07-13 13:10 | ✅ |
| `public/uploads/` (-A) | 232 | 232 | ✅ |
| `public/videos/` (-A) | 2 | 2 | ✅ |
| `prisma/schema.prisma` | unchanged | unchanged | ✅ |
| `prisma/migrations/` | 17 entries | 17 entries | ✅ |
| `.env*` | not read | not read | ✅ |
| `package.json` / lock | unchanged | unchanged | ✅ |
| pre-existing dirty-tree edits | preserved | preserved | ✅ |

## Verification Commands Run

- `npm run verify:quick` → 198 pass / 0 fail
- `npm run verify` (with `output:"standalone"`) → lint + test:ci + build, exit 0
- `git diff --check` → clean
- `node --test docs/desktop-w0/standalone/package-content-audit.test.mjs` → 3 pass
- `node --import tsx docs/desktop-w0/prisma-spike/t012-prisma-crud-spike.mjs` → CRUD + RO pass
- `DEEPLISTENER_STANDALONE_ROOT=… node desktop-spike/verify-spike.mjs` → 27 pass
- `node --import tsx --test desktop-spike/t031-auth-contract.test.ts` → 6 pass
- `electron desktop-spike/main-probe.js` (headless) → 8 pass
- `electron desktop-spike/.` (headless lifecycle) → healthy, clean shutdown
- `node --import tsx --test tests/fixtures/desktop/data-root-helper.test.ts` → 3 pass

## Evaluator Decision

W0 is complete and accepted. This is feasibility approval to begin W1
contract-freeze work. It is **not** approval to publish installers, migrate
active data, add signing secrets, bundle binaries, or begin W3+ packaging —
those remain separately authorized Adversarial contracts.
