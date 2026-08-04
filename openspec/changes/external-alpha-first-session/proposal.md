# External Alpha First-Session Proposal

## Why

DeepListener's external desktop-alpha hypothesis is not testable from the current
landing page: the demo seed API exists, but a new learner has no visible action
that reaches it. The setup page also describes a provider key as ready when only
local configuration has been observed. Finally, Capture reports success without
making the Vault-to-Review handoff explicit, and sentence text editing silently
clears notation data.

## Goal

Make the first-session and core Capture contracts honest and observable without
adding a provider call, schema migration, background job, or new persistent user
state.

## Scope

- Add a visible, idempotent **Try the demo** action that seeds the existing demo
  and opens its practice route in blind mode.
- Describe provider status as configured rather than connected; state that
  connectivity, quota, proxy, and model access are checked only during media
  import.
- After Capture, show explicit links to the current Track's Vault view and the
  Review queue.
- Preserve the current notation JSON when editing sentence text. Do not attempt
  automatic token-index migration in this change.

## Non-goals

- No real speech demo asset or licensing decision.
- No live provider probe, price lookup, retry, or failover.
- No unclassified/staged Vault state, undo API, database migration, import job,
  transcription provenance schema, or user research automation.
- No edits to protected database/media/configuration.

## Evidence boundary

This change makes product contracts testable; it does not prove external-user
activation. The external-alpha usability protocol remains a follow-up requiring
an installable clean-profile build and a meaningful owned/licensed speech demo.
