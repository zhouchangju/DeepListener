# External Alpha First-Session Design

## First-session flow

```text
Landing page
  -> Try the demo
  -> POST /api/demo (idempotent)
  -> /practice/demo-listening-001?demo=1
  -> blind mode starts enabled
  -> learner may reveal text and Capture a sentence
```

The demo remains owned by `trackType = DEMO` and is removable by the existing
demo API. A failed seed request stays on the landing page and exposes an
actionable error; it never mutates personal records.

## Provider status contract

The provider readiness card keeps its existing read-only check and status model.
Only the provider card label changes from **Ready** to **Configured**. Its detail
must explicitly state that a present key is not proof of authentication, quota,
proxy, model access, or long-media success. The existing import path remains the
first real connectivity check because it is the first point that sends selected
audio to an external provider and may incur cost.

## Capture handoff

After a successful `POST /api/vault`, the Practice page renders a local status
notice with two deterministic links:

- `/vault?trackId=<trackId>` — inspect the saved item in the current Track;
- `/review` — enter the existing FSRS review queue.

The notice is dismissible presentation state only. No new database field is
needed, and the existing toast remains as a concise success signal.

## Text and notation preservation

Text editing sends the current in-memory notation JSON along with the new text.
The server keeps the existing `Sentence.formatting` string. Token indices are
not rewritten or guessed. This prevents silent deletion while preserving an
explicit limitation: marks may require manual review after a text edit.

## Verification seams

- Landing source test asserts the demo action, loading/error handling, and route
  contract.
- Practice page/client source tests assert the `demo=1` blind-mode handoff and
  Vault/Review links.
- Setup source/message test asserts provider status wording and the no-probe
  boundary.
- Shadowing source test asserts text edits do not submit `formatting: null`.
- Existing demo-seed tests remain the ownership/idempotency guard.
