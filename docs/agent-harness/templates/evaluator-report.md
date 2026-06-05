# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | success / warning / error |
| summary | [one-line result] |
| next_actions | [required next steps, or none] |
| artifacts | [paths to logs, screenshots, reports] |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | [path] |
| Safety profile | [path] |
| Domain | [domain] |
| Date | YYYY-MM-DD |
| Evaluator | AI Agent / Human |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | [preserved behavior] | pass / fail / skipped | [evidence] |
| AC-CHANGE-001 | [requested improvement] | pass / fail / skipped | [evidence] |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` unchanged or approved | pass / fail / skipped | [git status / file check / approval] |
| `public/uploads/` unchanged or approved | pass / fail / skipped | [git status / file check / approval] |
| `.env*` not edited | pass / fail / skipped | [git status / note] |
| `npm run sync` not run or approved | pass / fail / skipped | [command log / approval] |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| `[command]` | pass / fail / skipped | [summary] |

## Browser Verification

| ID | Route | Result | Evidence |
|---|---|---|---|
| BV-001 | [/route] | pass / fail / skipped | [notes/screenshot] |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | blocker / must-fix / accepted-deviation / follow-up | [area] | [finding] | [action] |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes / no | [why] |

## Handoff Notes

- [What the next agent or human should know]
