import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

const WorkflowSchema = z.object({
  tracker: z.object({
    kind: z.enum(['linear']),
    endpoint: z.string().optional().default('https://api.linear.app/graphql'),
    api_key: z.string().optional(),
    project_slug: z.string(),
    active_states: z.array(z.string()).default(['Todo', 'In Progress']),
    terminal_states: z.array(z.string()).default(['Closed', 'Cancelled', 'Canceled', 'Duplicate', 'Done']),
  }),
  polling: z.object({
    interval_ms: z.number().default(30000),
  }),
  workspace: z.object({
    root: z.string().default('.symphony_workspaces'),
    hooks: z.object({
      after_create: z.string().optional(),
      before_run: z.string().optional(),
      after_run: z.string().optional(),
      before_remove: z.string().optional(),
    }).optional(),
  }),
  agent: z.object({
    max_concurrent_agents: z.number().default(10),
    max_turns: z.number().default(20),
  }),
  codex: z.object({
    command: z.string().default('codex app-server'),
    approval_policy: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
    thread_sandbox: z.string().optional(),
    turn_sandbox_policy: z.record(z.string(), z.any()).optional(),
    turn_timeout_ms: z.number().default(3600000),
    stall_timeout_ms: z.number().default(300000),
  }),
});

export type WorkflowConfig = z.infer<typeof WorkflowSchema>;

export interface Workflow {
  config: WorkflowConfig;
  prompt_template: string;
}

export function loadWorkflow(repoOrFilePath: string): Workflow {
  let workflowPath = repoOrFilePath;
  if (fs.existsSync(workflowPath) && fs.lstatSync(workflowPath).isDirectory()) {
    workflowPath = path.join(workflowPath, 'WORKFLOW.md');
  }

  if (!fs.existsSync(workflowPath)) {
    throw new Error(`Workflow file not found: ${workflowPath}`);
  }

  const content = fs.readFileSync(workflowPath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (match) {
    const yamlContent = match[1];
    const promptTemplate = match[2];
    const config = WorkflowSchema.parse(yaml.load(yamlContent));
    return { config, prompt_template: promptTemplate };
  } else {
    // If no front matter, treat entire file as prompt (default config)
    const config = WorkflowSchema.parse({});
    return { config, prompt_template: content };
  }
}
