import { rm } from "node:fs/promises";
import { resolveLayout, type RuntimeLayout } from "@/lib/runtime-paths";
import { importJobStagingDirectory, readManifest, writeManifest } from "./manifest";
import type { PublicImportJob } from "./types";
import { toPublicImportJob } from "./manifest";
import { ImportJobError } from "./run";

export async function cancelImportJob(
  operationId: string,
  layout: RuntimeLayout = resolveLayout(),
): Promise<PublicImportJob> {
  const manifest = await readManifest(operationId, layout);
  if (!manifest) throw new ImportJobError("IMPORT_FAILED", "Import operation was not found.");
  if (manifest.status === "ACTIVATED") throw new ImportJobError("IMPORT_FAILED", "An active track cannot be removed from import recovery.");
  if (manifest.status === "TRANSCRIBING" || manifest.status === "ACTIVATING") {
    throw new ImportJobError("IMPORT_FAILED", "This import is currently being processed.");
  }
  await rm(importJobStagingDirectory(operationId, layout), { recursive: true, force: true });
  const canceled = await writeManifest({
    ...manifest,
    status: "CANCELED",
    phase: "canceled",
    error: undefined,
  }, layout);
  return toPublicImportJob(canceled);
}
