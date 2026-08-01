# T042 — Demo Isolation and Removal Model (Data Contract)

| Field | Value |
|---|---|
| Task | T042 (Lane W0-D) |
| Req | FR-024, DFS-004 |
| Sprint | SPR-001, `2026-07-22-desktop-feasibility` |
| Mode | Adversarial — **contract/design only** |
| Date | 2026-07-22 |
| Scope | Define the data contract for demo ownership and removal **without altering personal records**. **No schema migration, no code, no Prisma change.** The chosen representation is a *contract* later tasks (T061 representation owner, T140 migration owner, T192 seed/removal implementation) implement under their own ownership. |

> Companion to [`demo-script.md`](./demo-script.md) (T040), which fixes the
> *semantic* marker concept ("demo-owned data is identifiable and removable").
> This document fixes the *data contract*: how ownership is represented, what
> removal may and may not touch, and how mixed libraries and repeat
> initialization behave. Schema references below are read from the frozen
> `prisma/schema.prisma` and are descriptive.

---

## 1. The invariant this contract exists to enforce

FR-024 / DFS-004, stated as an absolute invariant:

> **Removing demo content SHALL NOT delete or mutate any personal Track,
> Sentence, ReviewItem, ReviewLog, ErrorTag, Category, StudySession, or
> personal media file.** Personal data and demo data coexist; demo removal is a
> strictly scoped, additive-inverse-of-seed operation.

Everything in this document is in service of that invariant. NFR-001 (no
operation may overwrite the only known-good copy of user data) and the
sprint's DATA-SAFE stop conditions make this release-blocking.

---

## 2. Ownership model — options evaluated

The demo must be distinguishable from personal data so removal can be scoped.
Three representations were considered. All three assume the existing cascade
structure already present in `prisma/schema.prisma`:

```
Track 1—* Sentence 1—1 ReviewItem 1—* ReviewLog
                              *—* ErrorTag (via "ErrorTagToReviewItem")
Track *—* Category (via TrackCategory)
```

Because `Sentence`, `ReviewItem`, and `ReviewLog` all cascade-delete with their
parent `Track` (`onDelete: Cascade`), **ownership is determined at the Track
level and propagates downward.** The only question is how to mark a Track as
demo-owned.

### 2.1 Option A — `source: "DEMO"` flag reusing `Track.trackType` (no migration)
Set the existing nullable `Track.trackType` to the reserved value `"DEMO"` on
demo Tracks. `trackType` is already a free-form `String?`, so **no schema
change is required to introduce the marker value.** Media identifiers for demo
content use a distinct `demo://` scheme namespace (see demo-script §3.1).

- **Pros:** zero migration cost; the marker rides on an existing column;
  ownership query is a single indexed-ish filter (`trackType = "DEMO"`); the
  cascade structure already removes descendants when a demo Track is deleted.
- **Cons:** `trackType` is shared with real taxonomy use, so `"DEMO"` must be a
  reserved value that personal import never assigns; weak type-safety (a String,
  not an enum); a future schema owner (T061) may want a dedicated field.

### 2.2 Option B — Separate demo category / namespace
Create a `Category` row named e.g. `"__DEMO__"` and link demo Tracks to it via
`TrackCategory`. Ownership = "Track belongs to the `__DEMO__` category."

- **Pros:** uses the existing Category/TrackCategory relation; no new column.
- **Cons:** **rejected.** Categories are user-facing taxonomy (`Category.name
  @unique`); a magic category pollutes the user's taxonomy, is visible/editable
  by the user, and could be detached — at which point a demo Track would lose
  its ownership marker and become indistinguishable from personal data,
  violating the §1 invariant. Coupling ownership (a safety property) to
  taxonomy (a user-editable property) is unsafe by design.

### 2.3 Option C — Dedicated demo ownership table
A new side table (e.g. `DemoOwnership { trackId @unique }`) recording which
Tracks are demo-owned.

- **Pros:** strongest separation; ownership is independent of any user-editable
  field; easy to audit.
- **Cons:** **requires a schema migration** (new model + FK), which is
  **forbidden in W0** (OOS-002, DATA-SAFE-006). It also splits ownership across
  two places (a Track could exist without/with a side row after a partial
  failure), reintroducing consistency risk. Defers cleanly to a later wave if
  T061 decides the type-safety of Option A is insufficient.

### 2.4 RECOMMENDATION — Option A (`Track.trackType = "DEMO"`)

**Recommend Option A for the initial implementation.** It needs no migration,
respects the W0 schema freeze, and leverages the existing cascade structure so
removal of a demo Track automatically removes its Sentences, ReviewItems, and
ReviewLogs. The one real risk — collision with personal taxonomy use — is
mitigated by **reserving** the value `"DEMO"` (personal import must never
assign it; enforced as a contract below).

Option C remains the upgrade path: if T061 (the representation owner in W1)
decides the String marker is insufficiently safe, it can introduce a dedicated
ownership field/table **in its own migration**, without invalidating this
contract's invariants — because the invariants are about *behavior*, not about
which column holds the flag.

> **Note on authority:** choosing the marker value needs no schema change, so it
> is within W0-D's documentation scope. Any *future* move to Option C is a W1+
> schema decision owned by T061/T140 under a new contract — not implied here.

---

## 3. Data contract — ownership representation

### 3.1 Ownership predicate

A record is **demo-owned** iff it is reachable from a Track whose ownership
marker is `"DEMO"`. Concretely, with Option A:

| Entity | Demo-owned iff |
|---|---|
| `Track` | `trackType = "DEMO"` |
| `Sentence` | its `Track` is demo-owned |
| `ReviewItem` | its `Sentence` (→ `Track`) is demo-owned |
| `ReviewLog` | its `ReviewItem` (→ `Sentence` → `Track`) is demo-owned |
| `ErrorTag` | **shared** — see §3.3 (tags are global, never deleted by demo removal) |
| `Category` / `TrackCategory` | **personal** — demo seeding must not create user-visible categories |
| `StudySession` | **personal** — demo interactions must not write StudySession rows |

### 3.2 Reserved values and the media namespace

- `"DEMO"` is a **reserved** value of `Track.trackType`. The personal import
  path (`src/app/api/upload/route.ts`) must never set `trackType = "DEMO"`. This
  is a contract the implementation (T124 import owner) must enforce; it is
  enforceable today because import does not set `trackType` at all (it leaves
  the column null).
- Demo media identifiers use the **`demo://` scheme namespace** (e.g.
  `demo://deeplistener-demo/morning-routine.mp3`). This keeps demo media
  resolvable to bundled package resources and visually distinct from personal
  uploads (which use the `public/uploads/`-relative URL space). The media
  resolver (T121/T122) routes `demo://` to bundled assets and never to
  `public/uploads/` or `public/videos/`.

### 3.3 ErrorTag handling (the shared-resource edge case)

`ErrorTag` is global (`name @unique`) and many-to-many with `ReviewItem`. Demo
seeding may **connect** a demo ReviewItem to a tag (e.g. `"demo-tag"`) but the
tag itself is **not** demo-owned. Therefore:

- Demo removal **disconnects** demo ReviewItems from their tags
  (handled by `onDelete: Cascade` on the `ReviewItem` side of the relation
  already), but **must not delete** an `ErrorTag` row, even one that is now
  only referenced by demo items, **unless** an explicit, separate
  "remove demo" step can prove the tag was created by demo seeding *and* is
  referenced by zero personal ReviewItems. Conservative default: **never
  delete ErrorTags during demo removal.** Orphaned tags are harmless; deleting
  a tag a personal item still uses would violate §1.

### 3.4 StudySession and review statistics

Demo practice must **not** write `StudySession` rows and must **not** advance
personal review statistics. The demo journey is observational; its ReviewItems
are demo-owned (removed with the demo) and excluded from personal dashboards.
This keeps the user's real study history clean.

---

## 4. Removal invariants

"Remove demo content" is a single user action whose effect is precisely the
inverse of seeding. The following invariants are **mandatory** and each must be
covered by an executable test in T192.

| ID | Invariant |
|---|---|
| **INV-1** | Removing the demo deletes **only** Tracks with `trackType = "DEMO"` and, via existing cascades, their Sentences, ReviewItems, and ReviewLogs. |
| **INV-2** | Removing the demo **must not** delete or mutate any personal `Track`, `Sentence`, `ReviewItem`, `ReviewLog`, `Category`, `TrackCategory`, or `StudySession`. |
| **INV-3** | Removing the demo **must not** delete or mutate any personal media file under `public/uploads/` or `public/videos/`, nor any bundled demo media that other installs share (demo media is package-bundled, read-only, and never user-writable). |
| **INV-4** | Removing the demo **must not** delete `ErrorTag` rows (§3.3). It only severs demo ReviewItem↔ErrorTag links (via cascade). |
| **INV-5** | Demo removal is **idempotent**: running it twice has the same effect as running it once (the second run is a no-op). |
| **INV-6** | Demo removal is **reversible only by re-seeding**: there is no "undo remove" that touches personal data. Re-seeding (§6) restores demo content as if freshly initialized. |
| **INV-7** | Demo removal preserves all personal review scheduling (`ReviewItem.due`, `nextReview`, `level`, `stability`, `dr`, `reps`, `lapses`) byte-for-byte — these are the user's learning history. |

### 4.1 Implementation shape (contract for T192, not code here)

Removal is a **transactional, ownership-scoped delete**:

1. Begin a transaction.
2. Select demo Tracks: `WHERE trackType = "DEMO"`.
3. Delete those Tracks; rely on `onDelete: Cascade` to remove dependent
   Sentences/ReviewItems/ReviewLogs. (Do **not** issue deletes against
   personal predicates.)
4. Do **not** touch `ErrorTag`, `Category`, `TrackCategory`, `StudySession`,
   `public/uploads/`, `public/videos/`, or any Track without the marker.
5. Commit.

Because the predicate is ownership-scoped (`trackType = "DEMO"`) and cascades
do the dependent cleanup, there is no path by which a personal row is selected
or deleted. This is the structural guarantee behind INV-1/INV-2.

---

## 5. Mixed-library behavior (demo + personal coexist)

FR-024 requires demo and personal data to **coexist**, not just to alternate.
The contract:

### 5.1 Library
- Personal and demo Tracks both appear in the Library. Demo Tracks carry a
  visible "Demo" badge (driven by `trackType = "DEMO"`).
- Sorting/filtering treats demo Tracks as first-class entries; the user may
  practice the demo alongside personal Tracks.

### 5.2 Practice
- `/practice/[id]` works identically for demo and personal Tracks. The only
  difference is the media source: `demo://` resolves to bundled assets, personal
  URLs resolve to the media service. No domain/UI fork (FR-080).

### 5.3 Vault
- Demo-captured ReviewItems appear in the Vault, badged "Demo." The user may
  keep them (they behave as real review items) or remove them via demo removal.
- Personal Vault items are never affected by demo presence or removal.

### 5.4 Review queue & dashboard
- Demo ReviewItems participate in the review queue like any other (so the demo
  can show the Review next step, demo-script §4 step 5). On demo removal they
  vanish from the queue; personal queue items and scheduling are unchanged.
- `StudySession` and dashboard statistics **exclude** demo activity (§3.4), so
  the user's real study history never inflates from demo use.

### 5.5 Removal-with-personal-data-present (the DFS-004 scenario)
The defining scenario (DFS-004 "Remove demo after personal use") is: the user
has imported personal media, captured personal Vault items, and built up review
history — **then** removes the demo. The contract guarantees INV-1..INV-7: only
demo-owned rows/assets are removed; personal Tracks, Sentences, ReviewItems,
ReviewLogs, media, and review scheduling are untouched. This is the acceptance
test for T192.

---

## 6. Repeat-initialization idempotence (re-seeding is safe)

FR-020 requires first-run DB initialization to be idempotent; demo seeding
inherits the same discipline. Re-seeding the demo (e.g. the user clicks "restore
demo" after removing it, or re-runs first-run) **must be safe**.

### 6.1 Idempotence contract
- **Re-seeding is upsert-by-ownership, not insert-blindly.** Re-running the
  seed does **not** create duplicate demo Tracks. The seeder checks for an
  existing demo Track (same bundled demo identity) and either skips or
  refreshes it in place.
- **Re-seeding never touches personal data.** The seed predicate is
  ownership-scoped (`trackType = "DEMO"` + the bundled demo identity); it never
  selects personal rows.
- **Re-seeding after removal is equivalent to first seed.** Because removal
  (§4) deletes demo rows cleanly and cascades fully, the DB state after
  "remove demo" is the same as "demo never seeded" from the personal data's
  perspective. A subsequent seed produces exactly one demo Track set, identical
  to a fresh init.
- **Re-seeding is deterministic.** The bundled timeline (demo-script §3.1)
  fixes sentence text/timing/orderIndex, so the seeded demo is byte-equivalent
  across runs (modulo UUIDs, which are opaque identifiers and not a correctness
  concern).

### 6.2 Why idempotence matters here
KPI-002 / KPI-003 assume a user can reach the demo deterministically. If
re-seeding duplicated Tracks or corrupted personal data, the demo would be a
liability rather than an on-ramp. Idempotence makes "Try the demo" a safe,
repeatable, side-effect-free action — which is what makes it usable as a
zero-terminal first run (J1).

---

## 7. Interaction with protected data and other lanes

- **Protected data is never touched** by this contract. Demo media is
  **package-bundled** (read-only, `demo://`), never written into
  `public/uploads/` or `public/videos/`. The contract explicitly forbids demo
  seeding/removal from reading or writing `prisma/dev.db` content belonging to
  personal data, `public/uploads/`, `public/videos/`, or `.env*`
  (DATA-SAFE-001..004).
- **No schema migration in W0.** Option A is chosen precisely because it needs
  none (OOS-002, DATA-SAFE-006). A future move to Option C is T061/T140's
  decision under a new contract.
- **No code in W0.** T192 implements seeding/removal; T124 (import) enforces
  the `"DEMO"` reservation; T121/T122 route `demo://` media. All are later-wave
  owners; this document is their input contract.

---

## 8. Test obligations (for T192, not executed in W0)

T192 must provide executable evidence for each invariant. Suggested cases:

| Case | Asserts |
|---|---|
| Seed demo on empty DB | exactly one demo Track set appears |
| Seed demo, then seed again | no duplicate demo Tracks; personal data unchanged |
| Seed demo, add personal Track/Vault/review history, remove demo | personal rows/media/scheduling byte-identical before/after (INV-1..7) |
| Remove demo twice | second removal is a no-op (INV-5) |
| Remove demo, re-seed | demo restored; personal data still unchanged (§6.1) |
| Personal import never sets `trackType = "DEMO"` | contract test on import path (§3.2) |
| `ErrorTag` created via demo survives demo removal | tag row present; only the demo ReviewItem link is gone (INV-4) |

These run against **disposable** SQLite roots (WRITE-001 `mktemp`), never
against `prisma/dev.db`.

---

## 9. Verify clause checklist (AC-T042)

| AC-T042 requirement | Where satisfied |
|---|---|
| Contract covers **mixed demo/personal library** | §5 (coexistence in Library/Practice/Vault/Review + the DFS-004 removal-with-personal-data scenario in §5.5) |
| Contract covers **repeat initialization** | §6 (idempotent re-seed, deterministic, side-effect-free) |
| Ownership model chosen | §2.4 recommends Option A; §3 fixes the representation contract |
| Removal invariants stated | §4 INV-1..INV-7 |
| Does not alter personal records | §1 invariant; §3.3 ErrorTag; §3.4 StudySession; §4.1 scoped delete; §7 protected-data boundaries |
| No schema migration / no code in W0 | §2.4, §7 (Option A needs none; implementation is T192's) |

---

## 10. Out of scope (explicit)

- Any Prisma migration or `schema.prisma` edit (OOS-002, DATA-SAFE-006).
- Implementing seed/removal code (T192).
- Implementing the `demo://` media resolver (T121/T122).
- Enforcing the `"DEMO"` reservation in the import path (T124).
- Touching protected data (`prisma/dev.db`, `public/uploads/`, `public/videos/`,
  `.env*`) — the contract explicitly forbids demo operations from doing so.
- Deciding the final storage representation for media (that is T061's, in W1).
