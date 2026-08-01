/**
 * Next.js instrumentation hook (runs once when the server starts, before any
 * route module is imported). Used to merge UI-configured transcription secrets
 * from `<data-root>/settings/secrets.json` into `process.env`, so the existing
 * factory and setup-readiness code keep reading `process.env` unchanged.
 *
 * This runs in the Node.js runtime only — Next.js skips `register()` in the
 * edge runtime, which is what we want (secrets belong on the server).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { loadSecretsIntoEnv } = await import("./lib/secrets-store");
  try {
    await loadSecretsIntoEnv();
  } catch (error) {
    // Don't crash startup over a secrets file we cannot read; the readiness
    // page will surface the underlying problem. Log for operator visibility.
    console.error("[instrumentation] Failed to load secrets.json:", error);
  }
}
