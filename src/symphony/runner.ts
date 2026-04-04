import { spawn } from 'child_process';
import { Issue } from './tracker';
import { Workflow } from './workflow';

export class AgentRunner {
  constructor(private workflow: Workflow) {}

  async run(issue: Issue, workspacePath: string): Promise<void> {
    const prompt = this.generatePrompt(issue);
    const command = this.workflow.config.codex.command;

    console.log(`Starting agent for ${issue.identifier} with command: ${command}`);
    
    // In a real Symphony, the agent would read the prompt from stdin or a file
    // Here we'll simulate by passing the prompt as an environment variable or file
    const child = spawn(command, [], {
      cwd: workspacePath,
      shell: true,
      env: {
        ...process.env,
        SYMPHONY_PROMPT: prompt,
        SYMPHONY_ISSUE_ID: issue.identifier,
        SYMPHONY_ISSUE_TITLE: issue.title,
      },
      stdio: 'inherit',
    });

    return new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`Agent for ${issue.identifier} completed successfully.`);
          resolve();
        } else {
          console.error(`Agent for ${issue.identifier} failed with code ${code}.`);
          reject(new Error(`Agent failed with code ${code}`));
        }
      });
    });
  }

  private generatePrompt(issue: Issue): string {
    let prompt = this.workflow.prompt_template;
    prompt = prompt.replace(/{{issue.identifier}}/g, issue.identifier);
    prompt = prompt.replace(/{{issue.title}}/g, issue.title);
    prompt = prompt.replace(/{{issue.description}}/g, issue.description);
    return prompt;
  }
}
