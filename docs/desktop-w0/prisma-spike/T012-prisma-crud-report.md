# T012 — Packaged Prisma Read/Write on Disposable SQLite

| Field | Value |
|---|---|
| Req | FR-020, FR-061, DLR-001 |
| Deps | T010, T002 |
| Verdict | **PASS** |
| Date | 2026-07-22 |

## What was proven

The Prisma client generated into `.next/standalone` (including the
`libquery_engine-darwin-arm64.dylib.node` native engine) was imported from the
packaged bundle, pointed at an **absolute** `file:` URL under a fresh `mktemp`
data root, and exercised through a full CRUD roundtrip. A read-only database
was correctly detected.

## Scenario 1 — Writable disposable DB

1. Created a disposable data root via `mktemp`.
2. Set `process.env.DATABASE_URL = "file:<abs>/database/deeplistener.db"`
   **before** importing the packaged client.
3. Initialized schema **offline** by piping the combined migration SQL through
   the `sqlite3` CLI (no `prisma migrate`, no `db push`, no dev dependency).
4. Imported `PrismaClient` from
   `.next/standalone/node_modules/.prisma/client/index.js`.
5. CRUD roundtrip:

| Operation | Result |
|---|---|
| `track.create` | returned id `spike-track-1` |
| `track.findUnique` | title "T012 spike track" |
| `track.update` (title + isArchived) | persisted |
| `sentence.create` (nested) | 1 sentence linked |
| `track.findUnique include sentences` | 1 sentence |
| `track.delete` | removed track |
| `sentence.findUnique` (orphan) | `null` — cascade confirmed |

```
schema initialized offline: 9 tables
CRUD roundtrip: CREATE/READ/UPDATE/DELETE + cascade — PASS
```

## Scenario 2 — Read-only DB detection

After initializing schema + inserting a baseline row, the DB file was flipped
to `chmod 0444`. A `track.create` then:

```
Read-only DB write correctly rejected (code=PrismaClientUnknownRequestError)
Read-only detection — PASS
```

This satisfies FR-061 / DCS-006: a read-only database is **not** reported
Ready; the error is surfaced as an actionable write failure. (W2 readiness
T112 will map this `PrismaClientUnknownRequestError` to a typed
`database: "action-needed"` state rather than surfacing the raw Prisma error.)

## Key architecture confirmations

| Question | Answer |
|---|---|
| Can the packaged Prisma engine load from standalone? | **Yes** — `libquery_engine-darwin-arm64.dylib.node` resolved beside the generated client. |
| Can an absolute `file:` URL override the schema-relative default? | **Yes** — set before client construction, it wins over any traced `.env`. |
| Does Prisma auto-create schema? | **No** — T010 showed `P2021` on an empty DB; schema must be initialized by a migration runner (→ T013). |
| Is a read-only DB detectable? | **Yes** — writes raise a catchable Prisma error. |
| Was `prisma/dev.db` touched? | **No** — sha256 unchanged; all DB I/O was against `mktemp` files. |

## Verify clause

> "integration runs from packaged output; read-only database produces Action
> needed; no active DB access."

**Met:** all three — packaged-output execution, read-only → actionable error,
zero access to `prisma/dev.db`.

## Commands

```bash
node --import tsx docs/desktop-w0/prisma-spike/t012-prisma-crud-spike.mjs
```

## Protected data after T012

- `prisma/dev.db` sha256: `c5183268…a08b1d` (unchanged)
- `public/uploads/` (`ls -A`): 232 (unchanged)
- `public/videos/` (`ls -A`): 2 (unchanged)
- orphan `deeplistener-w0` processes: 0
