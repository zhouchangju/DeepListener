# T011 — Standalone Package-Content Audit

| Field | Value |
|---|---|
| Req | FR-073, DRD-003 |
| Deps | T010 |
| Verdict | **PASS** |
| Date | 2026-07-22 |

## What was built

A reusable package-content audit script and mutation test:

- `docs/desktop-w0/standalone/package-content-audit.mjs` — asserts a standalone
  root contains every required runtime asset; exits 1 if any are missing or
  truncated.
- `docs/desktop-w0/standalone/package-content-audit.test.mjs` — proves the
  audit passes on a complete synthetic layout and fails when (a) the Prisma
  darwin-arm64 engine is removed, or (b) `server.js` is truncated.

## Required assets audited

| Asset | Why required |
|---|---|
| `server.js` (≥ 1000 B) | Next.js minimal standalone server entrypoint |
| `node_modules/@prisma/client/default.js` | Prisma client entrypoint |
| `node_modules/@prisma/client/runtime/library.js` | Prisma client runtime |
| `node_modules/.prisma/client/index.js` | Prisma generated client |
| `node_modules/.prisma/client/schema.prisma` | Prisma generated schema |
| `node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node` (≥ 100000 B) | native query engine |
| `package.json` | package manifest |
| `.next/static/` | Next.js static chunks/css/media |

## Mutation test results

```
✔ audit passes on a complete standalone layout
✔ audit FAILS when the Prisma darwin-arm64 engine is removed
✔ audit FAILS when server.js is too small (truncated bundle)
ℹ tests 3  ℹ pass 3  ℹ fail 0
```

## Audit against the REAL `.next/standalone` build

```
OK: server.js (6811B)
OK: node_modules/@prisma/client/default.js (61B)
OK: node_modules/@prisma/client/runtime/library.js (191178B)
OK: node_modules/.prisma/client/index.js (27913B)
OK: node_modules/.prisma/client/schema.prisma (3034B)
OK: node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node (17251592B)
OK: package.json (2003B)
MISSING: .next/static
AUDIT FAILED → exit 1
```

### Key packaging finding

The audit **correctly fails** against the raw `.next/standalone` output because
Next.js does **not** copy `.next/static` into the standalone bundle — this is
documented Next behavior. The desktop packager (W2-E / T150) MUST copy
`.next/static` into `<standalone>/.next/static` before the bundle is usable.
This is the first concrete packaging requirement W0 has produced and it flows
directly into T150's verify clause ("package-content audit and standalone route
smoke from temp directory").

## Verify clause

> "removing one required fixture asset makes the audit fail."

**Met:** proven by two mutation cases (missing engine, truncated server.js)
plus the real-build case (missing `.next/static`).

## Commands

```bash
# mutation tests
node --test docs/desktop-w0/standalone/package-content-audit.test.mjs
# audit a real build
node docs/desktop-w0/standalone/package-content-audit.mjs .next/standalone
```
