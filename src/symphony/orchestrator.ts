import fs from 'fs';
import path from 'path';
import { Workflow, loadWorkflow } from './workflow';
import { Tracker, LinearTracker, Issue } from './tracker';
import { WorkspaceManager } from './workspace';
import { AgentRunner } from './runner';

export interface SymphonyState {
  last_poll: string;
  active_agents: Array<{
    issue_id: string;
    issue_title: string;
    start_time: string;
    workspace: string;
  }>;
}

export class Orchestrator {
  private workflow: Workflow;
  private tracker: Tracker;
  private workspaceManager: WorkspaceManager;
  private agentRunner: AgentRunner;
  private activeRuns: Map<string, { issue: Issue; start_time: string; workspace: string }> = new Map();

  constructor(private repoRoot: string, workflowPath?: string) {
    this.workflow = loadWorkflow(workflowPath || repoRoot);
    this.tracker = new LinearTracker(this.workflow.config.tracker);
    this.workspaceManager = new WorkspaceManager(repoRoot, this.workflow.config.workspace);
    this.agentRunner = new AgentRunner(this.workflow);
  }

  async start() {
    console.log('Symphony Orchestrator starting...');
    console.log(`Polling every ${this.workflow.config.polling.interval_ms}ms`);

    while (true) {
      try {
        await this.poll();
        this.saveState();
      } catch (err) {
        console.error('Error during polling:', err);
      }
      await new Promise(resolve => setTimeout(resolve, this.workflow.config.polling.interval_ms));
    }
  }

  async poll() {
    const issues = await this.tracker.getIssues();
    const activeStates = this.workflow.config.tracker.active_states;
    const terminalStates = this.workflow.config.tracker.terminal_states;

    for (const issue of issues) {
      if (terminalStates.includes(issue.state)) {
        this.workspaceManager.cleanup(issue.identifier);
        continue;
      }

      if (activeStates.includes(issue.state)) {
        if (this.activeRuns.has(issue.identifier)) {
          continue;
        }

        if (this.activeRuns.size >= this.workflow.config.agent.max_concurrent_agents) {
          console.warn('Max concurrent agents reached, skipping issue:', issue.identifier);
          continue;
        }

        this.dispatch(issue);
      }
    }
  }

  private async dispatch(issue: Issue) {
    const wsPath = this.workspaceManager.ensureWorkspace(issue.identifier);
    this.activeRuns.set(issue.identifier, { 
      issue, 
      start_time: new Date().toISOString(),
      workspace: wsPath 
    });
    this.saveState();

    try {
      const beforeRun = this.workflow.config.workspace.hooks?.before_run;
      if (beforeRun) {
        console.log(`Running before_run hook for ${issue.identifier}`);
        this.workspaceManager.runHook(wsPath, beforeRun);
      }

      await this.agentRunner.run(issue, wsPath);

      const afterRun = this.workflow.config.workspace.hooks?.after_run;
      if (afterRun) {
        console.log(`Running after_run hook for ${issue.identifier}`);
        this.workspaceManager.runHook(wsPath, afterRun);
      }
    } catch (err) {
      console.error(`Error running agent for ${issue.identifier}:`, err);
    } finally {
      this.activeRuns.delete(issue.identifier);
      this.saveState();
    }
  }

  private saveState() {
    const state: SymphonyState = {
      last_poll: new Date().toISOString(),
      active_agents: Array.from(this.activeRuns.values()).map(run => ({
        issue_id: run.issue.identifier,
        issue_title: run.issue.title,
        start_time: run.start_time,
        workspace: run.workspace
      }))
    };
    
    const statePath = path.join(this.repoRoot, '.symphony_state.json');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }
}
