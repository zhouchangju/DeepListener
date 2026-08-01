# T010 — Next.js Standalone Build Spike Report

| Field | Value |
|---|---|
| Req | FR-001, DAS-001 |
| Deps | T000 |
| Verdict | **PASS** — standalone launches detached from repo on loopback |
| Date | 2026-07-22 |

## What was proven

A Next.js standalone bundle was produced, copied to a `mktemp` directory
(**outside** the repository and its `node_modules`), launched with an explicit
`DATABASE_URL` pointing at a disposable SQLite file under that temp root, and
served the application over loopback only.

## Build

`next.config.ts` was given `output: "standalone"` (AUTH-001, additive and
reversible). `npm run build` succeeded (exit 0) and produced
`.next/standalone/server.js` plus a traced `node_modules`.

## Standalone package contents (key runtime assets)

| Asset | Present | Path |
|---|---|---|
| Minimal server | ✅ | `.next/standalone/server.js` (6811 B) |
| Prisma generated client | ✅ | `node_modules/.prisma/client/index.js` |
| Prisma engine (darwin-arm64) | ✅ | `node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node` |
| `@prisma/client` runtime | ✅ | `node_modules/@prisma/client/runtime/library.js` |
| Traced `.next/static` | ❌ (must be copied manually — expected Next behavior) | copied from `.next/static` |
| Traced `public/` | ✅ (traced in) | `public/uploads`, `public/videos` (repo files, not user data) |
| Traced `.env` | ⚠️ present — **removed in spike** to prove no implicit repo coupling | replaced by explicit env |

## Launch evidence (loopback, detached)

```
spike root: /var/folders/.../T/deeplistener-w0-standalone-.XXXXXXXXXX
PORT=45171 DATABASE_URL=file:.../spike.db NODE_ENV=production HOSTNAME=127.0.0.1 node server.js
▲ Next.js 16.2.5
- Local: http://127.0.0.1:45171
✓ Ready in 0ms
```

`lsof` confirmed the only listener was `127.0.0.1:45171` — **no external
interface**.

## Endpoint probes

| Endpoint | Before migration | After migration (schema initialized) |
|---|---|---|
| `GET /` | HTTP 200, 52389 B, `<title>DeepListener</title>` | HTTP 200 |
| `GET /setup` | HTTP 200, 41083 B | HTTP 200, 40517 B |
| `GET /library` | HTTP 200, 25158 B (error-boundary fallback) | HTTP 200, 33326 B (clean empty library) |
| `GET /vault` | — | HTTP 200, 33595 B |
| `GET /review` | — | HTTP 200, 15220 B |
| `GET /dashboard` | — | HTTP 200, 27161 B |
| `GET /api/symphony/state` | HTTP 200, 56 B | HTTP 200 |
| `GET /practice/nonexistent-id` | — | HTTP 404 (clean) |

## Key feasibility finding — Prisma requires schema initialization

When `DATABASE_URL` pointed at a **non-existent/empty** SQLite file:

- The Prisma engine **did load and connect** (the packaged
  `libquery_engine-darwin-arm64.dylib.node` worked from standalone).
- `prisma.track.findMany()` raised `P2021: The table main.Track does not exist`.
- The Next.js error boundary caught it and rendered a degraded page (HTTP 200).

After applying the combined migration SQL via `sqlite3` CLI (offline, no
`prisma migrate`), all routes rendered cleanly with **zero new Prisma errors**
(error count 4 → 4 across the probe set).

**Implication:** Prisma Client does **not** auto-create schema. A packaged
desktop app MUST run migrations against the disposable DB before serving
requests. This is precisely what T012 (packaged Prisma CRUD) and T013
(migration runner selection) resolve. It is **not** a blocker — it confirms the
expected architecture (AD-006 copy-first migration, DLR-001 auto first-run
initialization) rather than contradicting it.

## Cleanup

- Spike process killed (PID confirmed gone).
- No orphan listener on port 45171.
- `mktemp` root removed.
- `prisma/dev.db` sha256 unchanged: `c5183268…a08b1d`.

## Verify clause

> "root, Setup, Library, and one API health request return expected responses
> outside the repository runtime."

**Met:** `/` (root), `/setup`, `/library`, and `/api/symphony/state` all
returned HTTP 200 from a `mktemp` location outside the repository, with
`process.cwd()` set to that temp root and no access to the repo `node_modules`.
