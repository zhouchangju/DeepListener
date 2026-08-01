# T040 — Demo Learning Script and Data Ownership

| Field | Value |
|---|---|
| Task | T040 (Lane W0-D) |
| Req | FR-022, FR-023, DFS-002, DFS-003 |
| Sprint | SPR-001, `2026-07-22-desktop-feasibility` |
| Mode | Adversarial — documentation only |
| Date | 2026-07-22 |
| Scope | Define the demo learning journey, its media provenance, its bundled timeline format, and a demo data-ownership marker. **No code, no media bundling, no provider call, no schema migration.** |

> This document is a product/provenance contract. Implementation of the demo
> journey is T193; isolation/removal mechanics are defined in
> [`demo-isolation.md`](./demo-isolation.md) (T042). The Sentence/Track model
> references below are read from the frozen `prisma/schema.prisma` and are
> descriptive only.

---

## 1. Goal of the demo

DeepListener's core loop is **sentence-level listening**. The demo must let a
first-time, provider-less learner experience the complete loop once, end to end,
so they understand the product's value before configuring anything:

```
blind listen  →  reveal / navigate sentence  →  capture one learning item
             →  discover where that item continues (Vault / Review)
```

This satisfies FR-023 / DFS-003 (the demo exercises blind listening, sentence
navigation/reveal, one learning capture action, and discovery of the
Vault/Review next steps) and Journey **J1: Zero-terminal demo** from the PRD.

### 1.1 Hard constraint — no provider call

The demo SHALL NOT call any transcription provider. FR-022 / DFS-002 require
that the demo uses owned/generated/clearly-licensed media **and bundled timeline
data**, and that "no provider request is made." Practically:

- The sentence timeline (start/end/text) is **bundled with the package**, so no
  OpenAI/Deepgram/Google transcription is required.
- The demo is reachable from the first-run choice without entering a provider
  key (DFS-001).
- `src/lib/transcription/factory.ts` and `src/app/api/upload/route.ts` are
  **not** on the demo playback path; the demo reads a pre-seeded Track whose
  `Sentence` rows already exist.

---

## 2. Demo media — legally safe options and recommendation

PRD §3.2 non-goal: "Automatically importing copyrighted demonstration media."
We must never bundle copyrighted audio. Three categories are legally safe:

### 2.1 Option A — Generated TTS audio (permissive license)

Synthesize a short clip (~30–60 s) using a TTS engine whose output is licensed
for redistribution (e.g. an open-licensed voice model, or a vendor TOS that
grants commercial redistribution of generated audio). The transcript is known by
construction, so the bundled timeline is exact.

- Pros: exact timeline; controllable length, pace, and difficulty; smallest
  legal risk if the voice model/TOs is redistribution-permissive.
- Cons: must record and keep the engine/model + TOs evidence; some vendor TOs
  forbid redistribution of generated audio — must be verified, not assumed.

### 2.2 Option B — Public-domain audio (e.g. LibriVox)

Use a LibriVox recording of a public-domain text. LibriVox dedications are
CC0/public-domain and explicitly permit any use including redistribution.

- Pros: real human speech (more representative than TTS); license is clean and
  well understood.
- Cons: must capture the exact LibriVox catalog URL, reader, dedication text,
  and source-text public-domain proof; timing/segments must be re-aligned to the
  chosen clip (the bundled timeline is ours, not LibriVox's).

### 2.3 Option C — Author-owned original short clip

The maintainer records an original short spoken-English clip (~30–60 s) and
licences it to the project.

- Pros: zero third-party dependency; full rights; exact transcript.
- Cons: requires recording effort and an explicit licence statement from the
  author.

### 2.4 RECOMMENDATION — Option C (author-owned original), Option A as fallback

**Primary: Option C — author-owned original short clip.** It removes all
third-party licence/TOs verification cost (which is exactly the kind of
obligation that W0-B is still resolving for FFmpeg in T021), keeps the timeline
exact and small, and matches the single-maintainer scope in NFR-053. If the
maintainer cannot record in time, **fallback: Option A** with a TTS engine whose
output TOs is verified redistribution-permissive, recorded with the model
version + TOs snapshot.

#### Required provenance record (DFS-002 scenario "provenance is audited")

Whichever option ships, the package MUST carry a `demo-PROVENANCE.md` (or
equivalent in the runtime asset manifest from T023) recording, at minimum:

| Field | Example (Option C) |
|---|---|
| `source` | Author-owned original recording by <maintainer> |
| `license` | Project-owned, redistributed as part of DeepListener (no third-party rights) |
| `ownership` | © maintainer; assigned to DeepListener for bundled distribution |
| `attribution` | "Narrated by <name> for DeepListener demo" (or "Public domain" if waived) |
| `redistribution` | Explicitly allowed, bundled inside the app package, no further clearance needed |
| `duration` | ~45 s, single speaker, clear English |
| `checksum` | sha256 of the audio file (added by T191 packaging) |
| `transcript source` | Authored by maintainer to match the audio; bundled as timeline (no provider) |

This satisfies **AC-T040**: provenance and redistribution are explicit, and no
provider call is required.

> **Out of scope here:** actually recording, licensing, or bundling the media.
> T191 ("Add approved demo assets and provenance") adds the asset and its
> checksum once this script is approved. This document only fixes the *source
> decision* (OD-005) and the journey contract.

---

## 3. Bundled timeline / transcript format (matches the Sentence model)

The demo's timeline is a JSON document bundled with the package. It maps 1:1 to
the existing `Sentence` model in `prisma/schema.prisma`:

```
model Sentence {
  id         String  @id @default(uuid())
  trackId    String
  text       String
  startTime  Float
  endTime    Float
  orderIndex Int
  formatting String?
  ...
}
```

### 3.1 Bundled timeline JSON shape

```json
{
  "schemaVersion": 1,
  "track": {
    "title": "DeepListener Demo — Morning Routine",
    "mediaType": "AUDIO",
    "audioUrl": "demo://deeplistener-demo/morning-routine.mp3",
    "trackType": "DEMO",
    "trackTopic": "demo"
  },
  "sentences": [
    { "orderIndex": 0, "startTime": 0.000, "endTime": 3.240, "text": "I usually wake up before my alarm goes off." },
    { "orderIndex": 1, "startTime": 3.240, "endTime": 6.810, "text": "The first thing I do is open the curtains." },
    { "orderIndex": 2, "startTime": 6.810, "endTime": 10.350, "text": "Then I put the kettle on and wait for it to boil." }
  ]
}
```

Notes on the shape:

- `startTime` / `endTime` are **seconds as Float**, matching the `Sentence`
  model and the `TranscriptionSegment` interface in
  `src/lib/transcription/types.ts` (`{ text; start; end }`).
- `orderIndex` is the 0-based sentence order, matching `Sentence.orderIndex`.
- `trackType: "DEMO"` is the **ownership marker** (see §5). It reuses the
  existing nullable `Track.trackType` column, so **no schema change is required
  for the marker itself**. The `audioUrl` uses a `demo://` scheme namespace to
  keep demo media identifiers visibly distinct from personal-library uploads.
- `mediaType: "AUDIO"` keeps the demo on the simplest playback path
  (`AudioPlayer`); a video demo is unnecessary for the first-session journey and
  would pull in the FFmpeg/video-subtitle paths out of scope for the demo.

### 3.2 Why a bundled timeline, not provider transcription

The normal import path (`src/app/api/upload/route.ts` →
`getTranscriptionProvider()` → `provider.transcribe()`) produces these segments.
For the demo we **skip that path entirely** and seed `Sentence` rows directly
from the bundled JSON. This is what makes the demo provider-free (FR-022) and
keeps it off the network.

---

## 4. Guided demo journey — mapped to existing routes

The journey is scripted so that every step lands on a route that already exists
in the Server edition (see `docs/desktop-w0/baseline.md` §2 route inventory).
The desktop first-run UI (T190) launches the user into step 1.

| # | Journey step | What the user does | Route / surface | Existing code anchor |
|---|---|---|---|---|
| 1 | **Blind listen** | Plays the demo audio with the transcript hidden, tries to catch meaning by ear | `/practice/[id]` with blind mode on | `PracticeClient.tsx` `blindMode` state; `AudioPlayer` |
| 2 | **Reveal / navigate sentence** | Reveals the transcript, clicks a sentence to jump the playhead to its `startTime`/`endTime`, steps prev/next | `/practice/[id]` | `AudioPlayer` + `SentenceList`; sentence click seeks to segment |
| 3 | **Capture one learning item** | On a sentence they missed, opens capture, adds 1–2 tags + a short note + a difficulty, saves to the Vault | `/practice/[id]` capture → `POST /api/vault` | `PracticeClient.saveToVault(tags, note, difficulty)`; `api/vault/route.ts` upserts `ReviewItem` + `ErrorTag` |
| 4 | **Discover Vault** | Lands on the Vault and sees the item just captured, with its tags/note/difficulty | `/vault` | `VaultPageClient`, `VaultListClient`, `VaultListItem` |
| 5 | **Discover Review (next step)** | Sees that captured items feed the review queue / due-next, so the loop continues | `/review` | `ReviewClient`, `review-queue` (items become due via `ReviewItem.due`/`nextReview`) |

### 4.1 Scripted narration (for the guided overlay, T193)

The guided journey overlay should communicate, in plain language:

1. *"Listen first without reading. Try to catch what you can by ear."* (blind listen)
2. *"Now reveal the sentences. Tap any line to jump there."* (reveal/navigation)
3. *"Found a sentence worth reviewing? Capture it — add a tag and a note."* (capture)
4. *"Everything you capture lives in your Vault."* (Vault discovery)
5. *"Your Vault items show up here for review, so you don't forget them."* (Review discovery)

### 4.2 Exit message (FR-022 / J1 step 6)

At the end of the demo the app states, plainly, that **transcribing your own
media requires a provider key unless the file already has embedded subtitles**
— so the user understands why the demo needed no key but personal media might.
This connects the provider-free demo to the personal-media/provider-setup path
(DFS-001) without forcing configuration.

---

## 5. Data ownership marker concept

Demo data must be **distinguishable** from personal library data (FR-024 /
DFS-004) so it can be removed without touching personal records. The marker
contract is specified in detail in [`demo-isolation.md`](./demo-isolation.md);
this section records the *concept* the demo script depends on.

### 5.1 Concept — `DEMO` ownership flag on Track

Every demo-owned `Track` carries an ownership marker. The recommended marker
(see T042 for the full trade-off and recommendation) reuses the existing
nullable `Track.trackType` column with the reserved value `"DEMO"`:

- A Track is demo-owned **iff** `trackType = "DEMO"`.
- All `Sentence`, `ReviewItem`, `ReviewLog`, and `ErrorTag` rows reachable from
  a demo Track are transitively demo-owned (via `onDelete: Cascade` already
  present in the schema for Sentence→ReviewItem→ReviewLog).
- Demo media identifiers use the `demo://` scheme namespace (see §3.1) so the
  media resolver can route demo playback to bundled resources without colliding
  with personal uploads.

### 5.2 What the marker enables in the journey

- **Library:** demo Tracks can be visually badged "Demo" and offered a single
  "Remove demo content" action.
- **Vault/Review:** demo-derived ReviewItems can be filtered out of personal
  review statistics, or shown with a demo badge.
- **Removal:** a single ownership query (`trackType = "DEMO"`) drives safe,
  scoped removal (T042 removal invariants).

### 5.3 Why this is a concept, not a schema change, for W0

The marker *value* (`"DEMO"` in `trackType`) needs **no schema migration**
because `trackType` is already a free-form nullable `String`. Whether the
production implementation keeps `trackType`, adds a dedicated column, or uses a
side table is decided in T042 / T061 — **out of scope for this document and for
W0 as a whole** (OOS-002 forbids schema edits). This document fixes only the
*semantic* contract: "demo-owned data is identifiable and removable."

---

## 6. Verify clause checklist (AC-T040)

| AC-T040 requirement | Where satisfied |
|---|---|
| Provenance explicit | §2.4 provenance record table; recorded by T191 packaging |
| Redistribution explicit | §2.4 `redistribution` field; Option C is project-owned |
| No provider call required | §1.1 hard constraint; §3.2 bundled timeline replaces `provider.transcribe()` |
| Owned/generated/clearly licensed media | §2 options; recommendation §2.4 |
| Exercises blind listen → reveal/navigate → capture → Vault/Review | §4 journey table + §4.1 narration |
| Demo distinguishable & removable (concept) | §5 ownership marker concept; mechanics in T042 |

---

## 7. Out of scope (explicit)

- Recording, licensing, or committing any audio file (T191, post-W0 gate).
- Any Prisma migration or `schema.prisma` edit (OOS-002).
- Implementing the guided overlay UI (T193).
- Implementing demo seeding/removal mechanics (T192; contract in T042).
- Running user sessions (T041 is a protocol document; T241/T243 run sessions).
- Touching `public/uploads/`, `public/videos/`, `prisma/dev.db`, or `.env*`
  (protected data — DATA-SAFE-001..004).
