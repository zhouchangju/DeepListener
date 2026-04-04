import { Orchestrator } from './orchestrator';

async function main() {
  const repoRoot = process.cwd();
  const workflowPath = process.argv[2];
  const orchestrator = new Orchestrator(repoRoot, workflowPath);
  
  await orchestrator.start();
}

main().catch(err => {
  console.error('Symphony failed to start:', err);
  process.exit(1);
});
