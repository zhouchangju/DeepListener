import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { WorkflowConfig } from './workflow';

export class WorkspaceManager {
  private root: string;

  constructor(private repoRoot: string, private config: WorkflowConfig['workspace']) {
    this.root = path.isAbsolute(config.root) ? config.root : path.join(repoRoot, config.root);
  }

  getWorkspacePath(issueIdentifier: string): string {
    return path.join(this.root, issueIdentifier);
  }

  ensureWorkspace(issueIdentifier: string): string {
    const wsPath = this.getWorkspacePath(issueIdentifier);
    if (!fs.existsSync(wsPath)) {
      console.log(`Creating workspace for ${issueIdentifier} at ${wsPath}`);
      fs.mkdirSync(wsPath, { recursive: true });
      
      const hook = this.config.hooks?.after_create;
      if (hook) {
        console.log(`Running after_create hook for ${issueIdentifier}`);
        this.runHook(wsPath, hook);
      } else {
        // Default behavior: copy repo
        this.copyRepo(this.repoRoot, wsPath);
      }
    }
    return wsPath;
  }

  runHook(wsPath: string, command: string) {
    try {
      execSync(command, { cwd: wsPath, stdio: 'inherit' });
    } catch (err) {
      console.error(`Hook failed: ${command}`, err);
    }
  }

  private copyRepo(source: string, dest: string) {
    const excludes = ['.git', 'node_modules', '.next', '.symphony_workspaces'];
    const files = fs.readdirSync(source);

    for (const file of files) {
      if (excludes.includes(file)) continue;
      
      const srcPath = path.join(source, file);
      const destPath = path.join(dest, file);
      
      execSync(`cp -R "${srcPath}" "${destPath}"`);
    }
  }

  cleanup(issueIdentifier: string) {
    const wsPath = this.getWorkspacePath(issueIdentifier);
    if (fs.existsSync(wsPath)) {
      const hook = this.config.hooks?.before_remove;
      if (hook) {
        console.log(`Running before_remove hook for ${issueIdentifier}`);
        this.runHook(wsPath, hook);
      }
      console.log(`Cleaning up workspace for ${issueIdentifier}`);
      fs.rmSync(wsPath, { recursive: true, force: true });
    }
  }
}
