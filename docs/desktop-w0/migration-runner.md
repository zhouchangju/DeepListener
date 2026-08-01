# T013 — Migration Runner Options Decision

| Field | Value |
|---|---|
| Req | FR-050, FR-051, FR-052 |
| Deps | T012 |
| Decision | **Bundled `prisma migrate deploy` (Option A) as primary; offline SQL runner (Option B) rejected for production but retained as a recovery fallback** |
| Date | 2026-07-22 |

## Options compared

### Option A — Bundled Prisma `migrate deploy`

Executable evidence (this task): the repo's local `prisma` binary was pointed
at a disposable `file:` SQLite under `mktemp`, with a temp copy of
`schema.prisma` + `migrations/` so the repo `dev.db` was never touched.

```
DATABASE_URL=file:<tmp>/test.db prisma migrate deploy --schema=<tmp>/schema.prisma
All migrations have been successfully applied.        exit 0
tables after deploy: 10  (9 business + _prisma_migrations)
_prisma_migrations: 15 applied / 15 done
re-run → "No pending migrations to apply."            exit 0  (idempotent)
repo prisma/dev.db sha256: c5183268…a08b1d  (unchanged)
```

| Criterion | Result |
|---|---|
| Uses existing migration SQL as source of truth | ✅ the same `prisma/migrations/**` already version-controlled |
| Runs fully offline | ⚠️ needs the Prisma **schema-engine** binary bundled alongside the query engine; verified the CLI works offline once the engine is present |
| Produces deterministic version state | ✅ `_prisma_migrations` table records every applied migration + `finished_at` |
| Packageable for macOS/Windows | ⚠️ requires shipping `@prisma/cli`/schema-engine in addition to the query engine; Prisma 5.x supports this via `node_modules/prisma` + engine binaries |
| Supports preflight and failure injection | ⚠️ `migrate deploy` is all-or-nothing per migration; `migrate status` gives preflight; failure leaves the migration marked failed in `_prisma_migrations` |
| No dev dependencies on user machine | ✅ bundled in the app; no shell command required by the learner |
| Idempotent | ✅ proven (re-run is a no-op) |

### Option B — Versioned SQLite migration runner (offline SQL pipe)

Executable evidence (T012): `sqlite3 <db> < combined-migrations.sql` created
all 9 business tables, and the packaged Prisma client then ran full CRUD.

| Criterion | Result |
|---|---|
| Uses existing migration SQL as source of truth | ✅ concatenates `prisma/migrations/*/migration.sql` |
| Runs fully offline | ✅ only the `sqlite3` library / better-sqlite3 — no schema-engine |
| Produces deterministic version state | ❌ no built-in version tracking; we would have to author and maintain a custom `_app_migrations` table + ordering + checksum logic |
| Packageable for macOS/Windows | ✅ smaller surface, but `sqlite3` CLI is not a JS-callable API — we'd re-implement via `better-sqlite3` or Prisma's own `$executeRawUnsafe` |
| Supports preflight and failure injection | ⚠️ must be hand-built per migration; no rollback DDL in the existing SQL |
| No dev dependencies on user machine | ✅ |
| Idempotent | ❌ re-running concatenated SQL would fail on `CREATE TABLE` duplicates unless we wrap each in `IF NOT EXISTS` — which diverges from the migration source of truth |

### Rejected: `prisma db push`

Explicitly rejected per the design doc (§7) and NFR discipline. `db push` does
not record migration history, is not idempotent in a versioned sense, cannot
preflight or roll back, and Prisma itself documents it as a development
convenience, not a production migration strategy. **Never used.**

## Decision: Option A (bundled `prisma migrate deploy`)

Rationale:

1. **Source of truth preserved.** The same `prisma/migrations/**` directory
   already drives Server development. A desktop runner that consumes it
   directly avoids a parallel, hand-maintained SQL pipeline (the main risk of
   Option B).
2. **Versioning is built-in.** `_prisma_migrations` gives idempotence,
   ordering, and completion tracking for free — Option B would require us to
   author and test an equivalent, which is exactly the kind of speculative
   abstraction the project guidelines warn against.
3. **Idempotence proven.** Re-running deploy is a verified no-op (DLR-001 /
   FR-051).
4. **The packaging cost is bounded and already expected.** The schema-engine
   binary is an additional asset, but W3-B (T180) already bundles
   platform-specific Prisma runtime; adding the migrate engine is an
   incremental packaging step, not an architectural change.
5. **Copy-first migration is not the runner's job.** AD-006 / DLR-002 require a
   verified pre-migration **backup** before any schema change. That backup +
   verify + activate state machine (T140/T142) wraps the runner; the runner
   itself only applies SQL to an already-backed-up, already-staged copy. So
   the runner's all-or-nothing nature is acceptable because activation is
   gated separately.

### Retained fallback

Option B (offline SQL via the packaged Prisma client's `$executeRawUnsafe`) is
documented as a **recovery fallback** for the case where a future Prisma
version's schema-engine cannot be packaged. It is not the primary path.

## Implications for later waves

| Wave | Impact |
|---|---|
| W1-D (T090) | The migration state machine wraps `migrate deploy`: discover → preflight (`migrate status`) → backup → deploy → verify → activate. State is read from `_prisma_migrations`. |
| W2-D (T140) | Implement the runner using the bundled `prisma` binary against the staged copy; never the active DB. |
| W3-B (T180) | Package the Prisma schema-engine alongside the query engine; the package-content audit (T011/T151) must assert both. |
| W2-A (T111) | The runtime Prisma **client** (query engine) is separate from the migration runner (schema engine); T012 already proved the client works from standalone. |

## Verify clause

> "one option selected with executable evidence and rollback behavior;
> `db push` explicitly rejected."

**Met:** Option A selected with the deploy + idempotence evidence above;
rollback behavior is provided by the wrapping backup+activate state machine
(AD-006), not by the runner alone; `db push` explicitly rejected.
