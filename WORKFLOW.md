---
tracker:
  kind: linear
  project_slug: deeplistener
  active_states: ["Todo", "In Progress"]
  terminal_states: ["Closed", "Cancelled", "Canceled", "Duplicate", "Done"]
polling:
  interval_ms: 30000
workspace:
  root: .symphony_workspaces
  hooks:
    after_create: |
      # Bootstrap the workspace
      cp -R ../../* . 
      # Skip large dirs manually if needed
    before_run: |
      echo "Starting agent run for issue $SYMPHONY_ISSUE_ID"
    after_run: |
      echo "Finished agent run for issue $SYMPHONY_ISSUE_ID"
agent:
  max_concurrent_agents: 5
  max_turns: 20
codex:
  command: "echo \"Agent starting for issue: $SYMPHONY_ISSUE_ID\"; sleep 5; echo \"Agent finished.\"" 
  approval_policy: always
  thread_sandbox: workspace-write
---

You are an expert full-stack engineer working on the DeepListener project.
DeepListener is an English listening practice tool using Next.js and Prisma.

Current Task:
Issue: {{issue.identifier}} - {{issue.title}}
Description: {{issue.description}}

Follow the guidelines in AGENTS.md and GEMINI.md.
Ensure all changes are verified and idiomatically complete.
