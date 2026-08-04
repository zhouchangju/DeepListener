/**
 * Next.js instrumentation hook (runs once when the server starts, before any
 * route module is imported). Used to merge UI-configured transcription secrets
 * from `<data-root>/settings/secrets.json` into `process.env`, so the existing
 * factory and setup-readiness code keep reading `process.env` unchanged.
 *
 * This runs in the Node.js runtime only — Next.js skips `register()` in the
 * edge runtime, which is what we want (secrets belong on the server).
 *
 * First-run DB initialization (DLR-001 / T140) also happens here. The packaged
 * desktop client previously shelled out to system `sqlite3` from the Electron
 * main process (FR-001 "no system dependency" violation + FR-050 data-safety
 * risk). Init now happens in this server boot path via the TS migration runner
 * (`src/lib/migration-runner.ts`), which uses Node's built-in `node:sqlite`:
 * no shell-out, per-migration transactions with rollback, and a pre-migration
 * backup gate (T142). The Electron main process no longer touches SQLite.
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

  // First-run database initialization. Dynamic imports keep these node-only
  // modules out of the edge runtime and match the secrets-load pattern above.
  // Guarded to the explicit-data-root (desktop) layout so the legacy dev
  // workflow (`prisma migrate dev` against prisma/dev.db) is untouched.
  try {
    const { resolveLayout, databaseFile, backupsDirectory } = await import(
      "./lib/runtime-paths"
    );
    const layout = resolveLayout();
    if (layout.mode === "desktop") {
      const { ensureDatabaseReady } = await import("./lib/migration-runner");
      const dbFilePath = databaseFile(layout.root, layout.mode);
      const backupDir = backupsDirectory(layout.root);
      // Prefer the packaged override from desktop/main.js; development falls
      // back to prisma/migrations under the application working directory.
      const migrationsDir = process.env.DEEPLISTENER_MIGRATIONS_DIR || undefined;
      const result = await ensureDatabaseReady(dbFilePath, backupDir, undefined, migrationsDir);
      if (result.ok) {
        const applied = result.migration.applied.length;
        const alreadyApplied = result.migration.alreadyApplied.length;
        console.log(
          `[instrumentation] Database ready at ${dbFilePath} (applied=${applied}, alreadyApplied=${alreadyApplied})`,
        );
      } else {
        // Migration failure leaves the database incompatible with the current
        // Prisma Client. Fail startup instead of reporting a healthy service
        // and opening a renderer that can only show database errors.
        const detail =
          result.stage === "backup"
            ? result.backup?.reason
            : result.migration?.error;
        const failedMigration =
          result.stage === "migrate"
            ? result.migration.failedMigration
            : undefined;
        throw new Error(
          `Database initialization failed at stage "${result.stage}"${
            failedMigration ? ` (migration: ${failedMigration})` : ""
          }: ${detail ?? "unknown error"}`,
        );
      }
    }
  } catch (error) {
    console.error("[instrumentation] Database initialization threw:", error);
    // Next.js catches a rejected instrumentation hook and may continue serving
    // requests. That would open a renderer against an incompatible database,
    // so database initialization is one of the few startup paths that must
    // terminate the embedded service immediately.
    const { terminateProcess } = await import("./lib/fatal-startup");
    terminateProcess(1);
  }
}
