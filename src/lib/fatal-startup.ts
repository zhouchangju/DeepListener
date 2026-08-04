/** Node-only process termination kept behind a dynamic import from instrumentation. */
export function terminateProcess(code: number): never {
  process.exit(code);
}
