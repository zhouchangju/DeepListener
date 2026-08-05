import { mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveLayout, mediaTempDirectory, runtimeStateDirectory, type RuntimeLayout } from "@/lib/runtime-paths";
import type { ImportArtifact, ImportJobManifest, PublicImportJob } from "./types";
import { IMPORT_JOB_VERSION } from "./types";

const OPERATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_STORAGE_KEY = /^(source|derived-audio|subtitle)\/[a-zA-Z0-9._()-]+$/;

export function importJobsRoot(layout: RuntimeLayout = resolveLayout()): string {
  return path.join(runtimeStateDirectory(layout.root), "import-jobs");
}

export function importJobDirectory(id: string, layout: RuntimeLayout = resolveLayout()): string {
  assertOperationId(id);
  return path.join(importJobsRoot(layout), id);
}

export function importJobManifestPath(id: string, layout: RuntimeLayout = resolveLayout()): string {
  return path.join(importJobDirectory(id, layout), "manifest.json");
}

export function importJobStagingDirectory(id: string, layout: RuntimeLayout = resolveLayout()): string {
  assertOperationId(id);
  return path.join(mediaTempDirectory(layout.root, layout.mode), id);
}

export function assertOperationId(id: string): void {
  if (!OPERATION_ID_PATTERN.test(id)) throw new Error("Invalid import operation ID");
}

export function createOperationId(): string {
  return randomUUID();
}

export function assertSafeStorageKey(storageKey: string): void {
  if (!SAFE_STORAGE_KEY.test(storageKey)) throw new Error("Invalid import artifact key");
}

export function resolveArtifactPath(manifest: ImportJobManifest, artifact: ImportArtifact, layout: RuntimeLayout = resolveLayout()): string {
  assertOperationId(manifest.id);
  assertSafeStorageKey(artifact.storageKey);
  const stagingRoot = path.resolve(importJobStagingDirectory(manifest.id, layout));
  const resolved = path.resolve(stagingRoot, artifact.storageKey);
  if (!resolved.startsWith(`${stagingRoot}${path.sep}`)) throw new Error("Import artifact escapes staging directory");
  return resolved;
}

export async function writeManifest(manifest: ImportJobManifest, layout: RuntimeLayout = resolveLayout()): Promise<ImportJobManifest> {
  assertOperationId(manifest.id);
  const dir = importJobDirectory(manifest.id, layout);
  await mkdir(dir, { recursive: true });
  const target = importJobManifestPath(manifest.id, layout);
  const temp = `${target}.tmp-${process.pid}-${Date.now()}`;
  const next: ImportJobManifest = { ...manifest, version: IMPORT_JOB_VERSION, updatedAt: new Date().toISOString() };
  const handle = await open(temp, "w", 0o600);
  try {
    await handle.writeFile(JSON.stringify(next, null, 2), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
  return next;
}

export async function readManifest(id: string, layout: RuntimeLayout = resolveLayout()): Promise<ImportJobManifest | null> {
  try {
    const raw = await readFile(importJobManifestPath(id, layout), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isManifest(parsed) || parsed.id !== id) return null;
    return parsed;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function listManifests(layout: RuntimeLayout = resolveLayout()): Promise<ImportJobManifest[]> {
  let entries: string[];
  try {
    entries = await readdir(importJobsRoot(layout));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const results: ImportJobManifest[] = [];
  for (const id of entries) {
    if (!OPERATION_ID_PATTERN.test(id)) continue;
    const manifest = await readManifest(id, layout);
    if (manifest) results.push(manifest);
  }
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function toPublicImportJob(manifest: ImportJobManifest): PublicImportJob {
  return {
    id: manifest.id,
    status: manifest.status,
    mediaKind: manifest.mediaKind,
    displayName: manifest.displayName,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
    phase: manifest.phase,
    provider: manifest.provider,
    error: manifest.error,
    trackId: manifest.trackId,
    hasSubtitle: manifest.artifacts.some((artifact) => artifact.kind === "subtitle"),
    estimatedBytes: manifest.estimatedBytes,
  };
}

export async function deleteManifest(id: string, layout: RuntimeLayout = resolveLayout()): Promise<void> {
  assertOperationId(id);
  await rm(importJobDirectory(id, layout), { recursive: true, force: true });
}

function isManifest(value: unknown): value is ImportJobManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ImportJobManifest>;
  return candidate.version === IMPORT_JOB_VERSION
    && typeof candidate.id === "string"
    && OPERATION_ID_PATTERN.test(candidate.id)
    && typeof candidate.status === "string"
    && Array.isArray(candidate.artifacts)
    && typeof candidate.originalName === "string"
    && typeof candidate.displayName === "string";
}
