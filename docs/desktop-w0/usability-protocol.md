# T041 — First-Session Usability Observation Protocol

| Field | Value |
|---|---|
| Task | T041 (Lane W0-D) |
| Req | KPI-001, KPI-002, KPI-003, KPI-004, DFS-006 |
| Sprint | SPR-001, `2026-07-22-desktop-feasibility` |
| Mode | Adversarial — documentation only |
| Date | 2026-07-22 |
| Scope | Define the **observation protocol** for first-session usability sessions. **This document does not run sessions.** Sessions are executed in T241 (first three) and T243 (final two), after the W4 signed-beta build exists. |

> This is the script + observation form, not a session result. It exists so the
> W0 feasibility gate (T050) can confirm there is a credible, falsifiable plan
> to produce the evidence KPI-001..004 require — and so DFS-006's "build
> success is not adoption proof" rule is enforced *at observation time*, not
> just in retrospect.

---

## 1. Why this protocol exists — the DFS-006 rule

PRD §13 and DFS-006 are emphatic: **a green build, a successful package, or a
screenshot is not adoption proof.** The desktop plan survives its strongest
counter-argument ("just ship Docker") only if observed target users actually
complete the install-to-first-practice loop without developer help.

Therefore every measurement in this protocol separates two things that are
easy to conflate:

| Concept | Definition | Evidence source |
|---|---|---|
| **Build success** | The package installed and launched; the local service is healthy; no crash. | Facilitator's machine/health check (objective, binary). |
| **User task completion** | The participant, using only in-app guidance and the script, reached the defined success state of the task **without facilitator intervention** beyond the allowed prompts. | Observation of the participant's own actions. |

> **Critical rule (AC-T041):** a task is scored **Completed** only when the
> *user* completed it. If the facilitator touched the keyboard, edited a file,
> opened a terminal, ran a command, or supplied a non-scripted workaround, the
> task is **Completed-with-intervention** or **Failed**, never **Completed** —
> *even if the build was green the whole time.* See §6 (intervention rules) and
> §7 (failure coding).

---

## 2. Participant profile

### 2.1 Target participant (P1-aligned)

- **Non-technical English learner.** Studying English at an
  upper-intermediate-to-advanced level; motivated by listening/dictation/
  shadowing/review, not beginner courses.
- **No Node.js / npm / terminal experience.** Has never run `npm install` or
  edited a `.env` file, and would not recognize Prisma/SQLite/FFmpeg.
- **Owns a personal Mac** (Apple Silicon for the first sessions; Intel handled
  per OD-001 once decided) used for everyday tasks, not development.
- **Has used** app stores, installers, and browser-based settings UIs.
- **May hold** an API key if they have one (e.g. has paid for an LLM/Podcast
  service) — but the protocol must also work for a participant with no key.

### 2.2 Exclusion criteria (do not recruit)

- Software developers, CS students, or anyone who has run a terminal command in
  the last 30 days.
- Anyone who has already used DeepListener (Server edition or otherwise).
- Maintainer's close collaborators (bias risk).
- Anyone under the locale's age of consent without guardian consent (privacy).

### 2.3 Recruitment target

- **Five** target-user sessions total (KPI-001 target: 5/5 clean install). Split
  as three in T241 and two in T243, per the task graph. Sessions are run only
  after T222 (signed beta) and T240 (a11y audit) are complete — never on a W0
  spike build.

---

## 3. Clean-machine condition

The participant's machine must be "clean" of developer prerequisites, because
the whole adoption thesis (PRD §13) is that prerequisite friction is the
blocker. The facilitator verifies, **before** the session, that the machine
has **none** of:

- Node.js / npm / nvm / volta / bun
- Prisma CLI
- FFmpeg / ffprobe on `PATH`
- Docker
- A checkout of the DeepListener repository
- Any prior DeepListener install or data directory

> If any prerequisite is present, the session is **invalid for KPI-001** and
> must be re-run on a clean profile (e.g. a fresh macOS user account, or a
> loaner Mac the facilitator has reset). The facilitator records which
> condition was used.

The signed beta installer (from T222) is the only artifact placed on the
machine. No terminal is opened by the facilitator during the session except
where §6 explicitly permits a recovery intervention (which then re-codes the
task).

---

## 4. Task list (exact sequence)

Each task has a defined **start state**, **success state** (what the user must
reach), and the **KPI** it feeds. Tasks run in order. The participant is told
the goal of each task in plain language, not the technical steps.

### Task 1 — Install  *(KPI-001, KPI-003)*
- **Start:** Facilitator hands the participant the installer file (or a signed
  download link). No instructions beyond "install this app, like you would any
  other."
- **Success state:** The app launches to its first-run screen under its own
  power (user double-clicked/installed/ran it). The app's own health/readiness
  reports the bundled runtime ready.
- **Not success:** The participant needs the facilitator to bypass Gatekeeper,
  fix permissions, or open a terminal.

### Task 2 — First run → choose demo  *(KPI-002)*
- **Start:** First-run screen.
- **Success state:** The participant chooses "Try the demo" and the demo
  practice opens (the `/practice/[id]` surface for the demo Track) with no
  provider configuration.
- **Not success:** Participant gets stuck on first-run, or believes they must
  configure a provider first.

### Task 3 — Demo learning loop  *(KPI-002)*
The participant completes the demo journey from
[`demo-script.md`](./demo-script.md) §4:
- (a) blind-listens,
- (b) reveals and navigates a sentence,
- (c) captures one learning item (tags + note + difficulty → Vault),
- (d) discovers the Vault, and
- (e) sees where the item continues in Review.
- **Success state:** At least one sentence-level capture completed **and** the
  participant can name/point to where that item lives next (Vault/Review).
- **Not success:** Participant cannot complete a capture, or does not discover
  the Vault/Review next step.

### Task 4 — Provider setup with a seeded error  *(KPI-004)*
- **Start:** Participant opens Settings and selects a provider. The facilitator
  hands the participant an **intentionally invalid** key/setting (e.g. a
  malformed key, or a wrong base URL/proxy) so that the first configuration is
  broken — this is the *seeded error*. The participant is **not** told it is
  broken.
- **Success state:** Using only in-app guidance (FR-036 distinct error
  messages: invalid credential, unreachable, proxy, quota, empty transcript),
  the participant diagnoses the error and corrects it to a working state
  (verified by the app's own connectivity check, FR-025/FR-035).
- **Not success:** Participant cannot interpret the error or needs the
  facilitator to explain it.

### Task 5 — Import owned media  *(Journey J2)*
- **Start:** Working provider (from Task 4) or an embedded-subtitle video
  fixture (J3 path, no provider needed).
- **Success state:** Participant imports a short owned audio/video file, sees
  stage-aware progress (FR-044), and the imported Track opens in Practice.
- **Not success:** Participant hits an unrecoverable import error or cannot
  find how to import.

> Tasks 4 and 5 use only the participant's own media or the legally-cleared
> demo/subtitle fixtures — never protected repo data (DATA-SAFE-002/003) and
> never copyrighted media.

---

## 5. Timings to capture

The facilitator timestamps each event. All timings are wall-clock from
installer launch (T0).

| Timing | Start → Stop | Feeds |
|---|---|---|
| `install-to-demo-action` | T0 → participant's first action inside the demo practice (Task 3a) | **KPI-003** (target ≤ 3 min median) |
| `demo-completion` | Task 2 start → Task 3 success state | **KPI-002** (target ≥ 80% without intervention) |
| `install-success` | T0 → Task 1 success state | **KPI-001** (target 5/5 clean installs) |
| `provider-recovery` | Task 4 seeded-error present → Task 4 corrected & verified | **KPI-004** (target ≥ 80% recovery) |
| `import-duration` | Task 5 start → Practice opens | qualitative (FR-044 progress UX) |
| `intervention-count` | per task | **KPI-002** denominator |

Medians/percentages are computed across the **five** sessions in the
aggregation step (T243), not per-session.

---

## 6. Intervention rules (when the facilitator may step in)

The facilitator's default posture is **silent observation**. Interventions
re-code the task (see §7). Three tiers:

### Tier 0 — No intervention (silent)
Allowed at all times: observing, taking notes, operating the screen-recorder,
nodding. The participant is encouraged to think aloud but is **not** prompted
toward an answer.

### Tier 1 — Scripted prompt (allowed, task stays "Completed-with-intervention")
The facilitator may read **only** a scripted, non-directive prompt when the
participant is visibly stuck for > 60 seconds and asks for help:
- *"What do you think the app is asking you to do here?"*
- *"Is there anything on this screen that looks like it would help?"*
- *"Feel free to skip this and come back."*

These prompts never name a button, menu, file, or command. If a scripted prompt
unblocks the participant, the task is recorded **Completed-with-intervention**
(counts against KPI-002's "without intervention" denominator).

### Tier 2 — Recovery intervention (task becomes "Failed-recovered")
The facilitator **may** intervene directly (touch keyboard, open terminal,
bypass an OS dialog, supply a known-good value) **only** when:
1. The app has crashed, hung, or hit a recovery screen the participant cannot
   escape (FR-005 bounded recovery), **and**
2. Continuing is impossible without it, **and**
3. The purpose is to let the participant proceed to later tasks, not to "rescue"
   the measurement.

Any Tier 2 action means the affected task is **Failed-recovered**, the
facilitator logs exactly what was done, and the measurement for that task is
not counted as user completion. Tier 2 must **never** write to protected repo
data; if a bug surfaces that would require touching `prisma/dev.db`,
`public/uploads/`, `public/videos/`, or `.env*`, the facilitator **stops the
session** and escalates (DATA-SAFE stop conditions).

### Hard prohibitions for the facilitator
- Never tell the participant where to click beyond the script.
- Never open a terminal to "just fix it" for the participant on Tasks 1–3
  (that is the entire point of KPI-001/002/003).
- Never edit `.env*` or run `npm`/`prisma`/`ffmpeg` commands on the
  participant's machine.
- Never dismiss or weaken the distinction in §1 to make a session "look good."
  (DFS-006 is the rule being enforced.)

---

## 7. Failure coding taxonomy

Each task outcome is coded exactly one way. Codes are mutually exclusive.

| Code | Meaning | Counts as user completion? |
|---|---|---|
| `COMPLETED` | Participant reached the success state with no intervention (Tier 0 only). | **Yes** |
| `COMPLETED_WITH_PROMPT` | Reached success state after a Tier 1 scripted prompt only. | **No** (intervention) |
| `FAILED_RECOVERED` | Did not reach success state under their own action; facilitator used Tier 2 to proceed. | **No** |
| `FAILED` | Did not reach success state; session ended or moved on without success. | **No** |
| `INVALID` | Clean-machine condition was violated, or session could not be run (crash before Task 1, hardware fault). | Excluded from denominators; re-run. |

Additionally, capture a **root-cause tag** per non-`COMPLETED` task, drawn from:

`INSTALLER` · `GATEKEEPER` · `FIRST_RUN_UI` · `DEMO_DATA` · `CAPTURE_FLOW` ·
`VAULT_DISCOVERY` · `REVIEW_DISCOVERY` · `PROVIDER_ERROR_MSG` ·
`PROVIDER_CONNECTIVITY` · `IMPORT_FLOW` · `PERF_LAG` · `CRASH` · `A11Y` · `COPY`
· `UNKNOWN`

Repeated root-cause tags across ≥ 2 sessions must be converted into scoped
follow-up tasks per DFS-006 / T242 (do not silently expand the current task).

---

## 8. Success thresholds (mapped to KPIs)

| KPI | Target | How computed from this protocol | Pass requires |
|---|---|---|---|
| **KPI-001** Clean install success | 5/5 observed macOS beta participants | Count of sessions where Task 1 = `COMPLETED` and clean-machine verified | all five Task 1 = `COMPLETED`, no `INVALID` |
| **KPI-002** Install-to-demo completion | ≥ 80% without facilitator intervention | (Tasks 2+3 = `COMPLETED`) / (valid sessions) | ≥ 4 of 5 reach Task 3 success with Tier 0 only |
| **KPI-003** Median install-to-first-demo action | ≤ 3 min after installer launch | Median of `install-to-demo-action` across valid sessions | median ≤ 180 s |
| **KPI-004** Provider setup recovery | ≥ 80% can correct one seeded error using in-app guidance | (Task 4 = `COMPLETED`) / (valid sessions) | ≥ 4 of 5 correct the seeded error with Tier 0 only |

> **Promotion gate (DFS-006 scenario "Beta promotion review"):** if fewer than
> five valid sessions exist, **or** any KPI threshold is unmet, **or** there are
> unresolved repeated intervention points, the usability gate is **incomplete**
> and formal promotion (M2 → M3) does not proceed. Observed blockers are
> converted to requirements/tasks (T242) and the gate is re-evaluated.

---

## 9. Privacy and consent

### 9.1 Consent (obtained before the session, in writing)
- Participant agrees to: screen recording, keystroke/time logging, and the
  facilitator taking observation notes.
- Participant is told: they may stop at any time, skip any task, and ask to
  delete the recording.
- Participant is told: the app is local-first; **no media, transcripts, notes,
  or database contents leave their machine** as part of this observation. The
  only things recorded are the participant's *interaction* with the UI
  (screen + timings), not their learning content.

### 9.2 Data minimization in what is captured
- Screen recordings capture the **app UI and the participant's input** only.
- **Do not** capture: provider key values (the facilitator hands a seeded
  invalid key and never records the real one), imported media contents,
  transcript text, Vault notes, or database rows.
- The seeded key in Task 4 is **invalid by design**; even if recorded, it has
  no value.
- Diagnostic exports (FR-062) are redacted by construction and may be attached
  only with participant consent and after the facilitator confirms no
  credential/media content is present.

### 9.3 Storage and retention
- Recordings/notes are stored on the facilitator's encrypted disk, accessed
  only by the maintainer.
- Retained only until the T243 aggregate report is produced; then raw
  recordings are deleted unless the participant opts in to longer retention.
- The public aggregate report (T243 evidence) contains **no** personally
  identifying information and **no** personal media/transcript data
  (KPI-005 data-retention discipline applies by analogy).

### 9.4 No telemetry
NFR-015 / OOS-007: no background telemetry is enabled for these sessions. All
evidence comes from the facilitator's observation, not from the app phoning
home. The app used is the normal signed beta build with telemetry off.

---

## 10. Session run sheet (facilitator checklist)

1. **Pre-session:** verify clean-machine condition (§3); confirm signed beta
   installer (T222) and a11y audit (T240) are done; prepare seeded invalid key
   for Task 4.
2. **Consent:** obtain written consent (§9.1); start screen recorder.
3. **Tasks 1–5:** run in order; timestamp every event (§5); apply intervention
   tiers (§6); never break the §1 build-vs-completion rule.
4. **Per task:** record outcome code + root-cause tag (§7).
5. **Post-session:** stop recorder; confirm no protected repo data was touched;
   delete recordings per §9.3 unless opt-in.
6. **Aggregate (T243):** compute KPI-001..004 across five sessions; if any
   threshold unmet or repeated blockers unresolved, the gate stays incomplete
   (§8, DFS-006).

---

## 11. Verify clause checklist (AC-T041)

| AC-T041 requirement | Where satisfied |
|---|---|
| Protocol distinguishes **build success** from **user completion** | §1 (the rule), §6 (intervention tiers re-code tasks), §7 (`COMPLETED` requires Tier 0 only), §8 (KPIs computed from user completion, not build greenness) |
| Participant profile (non-technical, no Node/terminal) | §2.1 |
| Clean-machine condition (no dev prerequisites) | §3 |
| Exact task list (install → first run → demo → provider setup w/ seeded error → import) | §4 |
| Intervention rules (when facilitator may step in) | §6 (Tier 0/1/2 + hard prohibitions) |
| Timings to capture | §5 |
| Failure coding taxonomy | §7 |
| Privacy / consent notes | §9 |
| Success thresholds mapped to KPI-001..004 | §8 |
| Sessions not conducted now (T241/T243 run them) | §1 scope line; §2.3 |

---

## 12. Out of scope (explicit)

- **Running any usability session in W0.** Sessions require the signed beta
  (T222) and run in T241/T243. This document is the protocol only.
- Modifying any app code, settings, or copy to improve scores — blockers found
  in real sessions become scoped tasks via T242, never silent edits.
- Touching protected data (`prisma/dev.db`, `public/uploads/`, `public/videos/`,
  `.env*`) — the seeded-error task uses an invalid key and owned/fixture media
  only.
- Enabling telemetry (OOS-007). Evidence is observed, not reported home.
