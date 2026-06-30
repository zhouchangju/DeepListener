---
name: deeplistener-audit-followup
description: Turn audit findings into small, verifiable remediation tasks. Use after a codebase audit to create actionable fixes.
---

# DeepListener Audit Followup

## Workflow

1. Read the audit report from `docs/ai-harness/audits/`
2. Parse each finding into a remediation task
3. Prioritize: P0 (red line) > P1 (risk) > P2 (improvement)
4. For each task, define:
   - **What to change**: specific file and line
   - **Acceptance check**: command to verify the fix
   - **Estimated effort**: S/M/L
5. Create tasks and execute within the agent harness Contract mode

## Task Format

```markdown
### [P0/P1/P2] Short description

- **File**: `path/to/file.ts`
- **Issue**: What's wrong
- **Fix**: What to change
- **Verify**: `npm run lint && npm run build && node --import tsx --test <paths>`
- **Effort**: S/M/L
```

## Rules

- Do not fix issues outside the audit scope
- Each fix must be independently verifiable
- Preserve all existing behavior unless the audit explicitly changes it
- Record decisions in `docs/ai-harness/decision-log.md`
- After all fixes, re-run the audit to measure improvement
