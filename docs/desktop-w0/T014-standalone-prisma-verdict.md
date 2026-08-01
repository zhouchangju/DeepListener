# T014 — Standalone / Prisma Feasibility Verdict

| Field | Value |
|---|---|
| Req | proposal feasibility gate |
| Deps | T011, T012, T013 |
| Verdict | **PASS — proceed (no design revision required for W0-A)** |
| Date | 2026-07-22 |

## Evidence summary

| Question (from the W0 brief) | Answer | Evidence |
|---|---|---|
| Can Next.js standalone run detached from the repo and full `node_modules`? | **Yes** | T010: launched from `mktemp`, served `/`, `/setup`, `/library`, `/api/*` on `127.0.0.1` only, with no access to the repo runtime. |
| Can the packaged Prisma engine load from standalone? | **Yes** | T010/T012: `libquery_engine-darwin-arm64.dylib.node` (17 MB) loaded and connected from `.next/standalone/node_modules/.prisma/client/`. |
| Can an explicit absolute `file:` data root override schema-relative defaults? | **Yes** | T010/T012: `DATABASE_URL=file:<abs>` set before client construction won over the traced `.env`; the active `prisma/dev.db` was never touched. |
| Can Prisma CRUD run against a disposable SQLite? | **Yes** | T012: CREATE/READ/UPDATE/DELETE + cascade all passed; nested `sentence` create confirmed. |
| Is a read-only database detectable? | **Yes** | T012: `chmod 444` DB → `track.create` raised a catchable Prisma error (→ maps to FR-061 "action-needed"). |
| Can schema be initialized without `prisma migrate dev` / `db push`? | **Yes** | T013: `prisma migrate deploy` (Option A) applied 15 migrations idempotently; offline SQL pipe (Option B) also works as a fallback. |
| Is package completeness machine-verifiable? | **Yes** | T011: audit script asserts server/Prisma/static assets; mutation tests prove it fails on a missing engine or truncated server. Surfaced a real requirement: `.next/static` must be copied by the packager. |

## Required design changes carried forward

None that block the Electron decision. Two packaging requirements are now
concrete and flow into W2/W3:

1. **`.next/static` must be copied** into the standalone bundle by the
   packager (T150). Next does not trace it into `.next/standalone`.
2. **The migration runner needs the Prisma schema-engine binary** in addition
   to the query engine (T180). T013 selected bundled `migrate deploy`; the
   package-content audit (T011/T151) must assert the schema-engine is present.

## Residual risks (acceptable, tracked)

- Prisma version upgrades may change engine packaging rules; the audit (T011)
  is the guardrail.
- `_prisma_migrations` records state but does not roll back; the copy-first
  backup+activate state machine (T140/T142) provides recoverability.
- `migrate deploy` is all-or-nothing per migration; acceptable because
  activation is gated separately and the pre-migration backup is verified.

## Stop-condition check (from design §14)

| Stop condition | Triggered? |
|---|---|
| Next standalone requires Node privileges in renderer | No |
| Prisma cannot be packaged without an uncontrolled dev tree | No |
| Media serving requires loading large files into memory | Not in W0-A scope (→ W0-B/W2-B) |
| Migration cannot prove copy-first rollback | Runner itself doesn't roll back, but the wrapping state machine (T140/T142) will; not a W0 blocker |
| FFmpeg provenance/license unresolved | W0-B (T021) — separate lane |
| Platform conditionals spread into shared code | N/A to W0-A |
| Windows smoke reveals a business fork | N/A to W0-A |
| Packaging blocks Server verification repeatedly | No — `npm run verify` remains green with `output:"standalone"` |

**No W0-A stop condition triggered.**

## Verdict

The assumed low-rewrite Electron path (AD-001/AD-002 — host the existing Next
standalone service) is **validated for the standalone + Prisma dimension**.
The W0 brief's core questions for this lane are answered with executable
evidence, not documentation claims. Proceed to the integration gate (T050),
which also requires W0-B, W0-C, and W0-D verdicts.
