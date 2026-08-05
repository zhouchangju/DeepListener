import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import {
  activateRestore,
  createBackup,
  discardRestoreStage,
  inspectRestoreStage,
  stageRestore,
  validateBackup,
} from "@/lib/backup-service";
import { backupsDirectory, resolveLayout } from "@/lib/runtime-paths";

export const dynamic = "force-dynamic";

const BACKUP_ID_RE = /^backup-[A-Za-z0-9-]+$/;
const RESTORE_STAGE_RE = /^\.deeplistener-restore-[A-Za-z0-9-]+$/;
const IMPORT_STAGE_RE = /^\.deeplistener-backup-import-[A-Za-z0-9-]+$/;

function safeBackupId(value: unknown): string | null {
  if (typeof value !== "string" || !BACKUP_ID_RE.test(value) || value !== path.basename(value)) return null;
  return value;
}

function safeStageId(value: unknown): string | null {
  if (typeof value !== "string" || !RESTORE_STAGE_RE.test(value) || value !== path.basename(value)) return null;
  return value;
}

function safeImportStageId(value: unknown): string | null {
  if (typeof value !== "string" || !IMPORT_STAGE_RE.test(value) || value !== path.basename(value)) return null;
  return value;
}

async function listBackups(root: string) {
  const directory = backupsDirectory(root);
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  const backups: Array<{ id: string; createdAt: string; fileCount: number; bytes: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !BACKUP_ID_RE.test(entry.name)) continue;
    const backupPath = path.join(directory, entry.name);
    const validation = await validateBackup(backupPath);
    if (!validation.ok) continue;
    let bytes = 0;
    for (const file of validation.manifest.files) bytes += file.size;
    backups.push({
      id: entry.name,
      createdAt: validation.manifest.createdAt,
      fileCount: validation.manifest.files.length,
      bytes,
    });
  }
  backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return backups;
}

/** List valid local backups, create a new backup, or stage/activate a restore. */
export async function GET() {
  try {
    const layout = resolveLayout();
    return Response.json({ backups: await listBackups(layout.root) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Backups unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const layout = resolveLayout();
    const directory = backupsDirectory(layout.root);
    await mkdir(directory, { recursive: true });
    const action = body.action ?? "create";

    if (action === "create") {
      const id = `backup-${new Date().toISOString().replace(/[^0-9]/g, "")}-${randomUUID().slice(0, 8)}`;
      const result = await createBackup({ source: layout, destination: path.join(directory, id) });
      if (!result.ok) return Response.json({ error: "Backup could not be created", reason: result.reason }, { status: 409 });
      return Response.json({
        backup: {
          id,
          createdAt: result.manifest.createdAt,
          fileCount: result.manifest.files.length,
          bytes: result.manifest.files.reduce((sum, file) => sum + file.size, 0),
        },
      }, { status: 201 });
    }

    if (action === "import") {
      if (layout.mode !== "desktop") {
        return Response.json({ error: "Backup import is available only in the Desktop data profile" }, { status: 409 });
      }
      const stagingId = safeImportStageId(body.stagingId);
      if (!stagingId) return Response.json({ error: "Invalid backup staging" }, { status: 400 });
      const stagingPath = path.join(directory, stagingId);
      const validation = await validateBackup(stagingPath);
      if (!validation.ok) {
        await rm(stagingPath, { recursive: true, force: true }).catch(() => undefined);
        return Response.json({ error: "Imported backup is invalid", reason: validation.reason }, { status: 409 });
      }
      const id = `backup-${new Date().toISOString().replace(/[^0-9]/g, "")}-${randomUUID().slice(0, 8)}`;
      try {
        await rename(stagingPath, path.join(directory, id));
      } catch {
        return Response.json({ error: "Imported backup could not be stored" }, { status: 409 });
      }
      return Response.json({
        imported: true,
        backup: {
          id,
          createdAt: validation.manifest.createdAt,
          fileCount: validation.manifest.files.length,
          bytes: validation.manifest.files.reduce((sum, file) => sum + file.size, 0),
        },
      }, { status: 201 });
    }

    if (action === "restore") {
      if (layout.mode !== "desktop") {
        return Response.json({ error: "Restore is available only in the Desktop data profile" }, { status: 409 });
      }
      const backupId = safeBackupId(body.backupId);
      if (!backupId) return Response.json({ error: "Invalid backup" }, { status: 400 });
      const backupPath = path.join(directory, backupId);
      const stageId = safeStageId(body.stageId);
      if (!stageId) {
        const staged = await stageRestore({ backupPath, targetRoot: layout.root });
        if (!staged.ok) return Response.json({ error: "Restore preflight failed", reason: staged.reason }, { status: 409 });
        return Response.json({
          status: staged.status,
          restoreId: path.basename(staged.stage.stagingPath),
          conflicts: staged.stage.conflicts,
          fileCount: staged.stage.manifest.files.length,
        }, { status: staged.status === "conflict" ? 409 : 200 });
      }

      const stage = await inspectRestoreStage({
        stagingPath: path.join(path.dirname(layout.root), stageId),
        targetRoot: layout.root,
      });
      if (!stage) return Response.json({ error: "Restore stage expired or invalid" }, { status: 409 });
      const activated = await activateRestore({ stage, confirmReplace: body.confirmReplace === true });
      if (!activated.ok) {
        return Response.json({ error: "Restore needs confirmation", reason: activated.reason, restoreId: stageId, conflicts: activated.conflicts ?? stage.conflicts }, { status: 409 });
      }
      return Response.json({ restored: true, restartRequired: true, fileCount: activated.manifest.files.length }, { status: 200 });
    }

    if (action === "discard") {
      if (layout.mode !== "desktop") {
        return Response.json({ error: "Restore staging is available only in the Desktop data profile" }, { status: 409 });
      }
      const stageId = safeStageId(body.stageId);
      if (!stageId) return Response.json({ error: "Invalid restore stage" }, { status: 400 });
      const discarded = await discardRestoreStage(path.join(path.dirname(layout.root), stageId));
      return Response.json({ discarded }, { status: discarded ? 200 : 404 });
    }

    return Response.json({ error: "Unknown backup action" }, { status: 400 });
  } catch {
    return Response.json({ error: "Backup operation unavailable" }, { status: 500 });
  }
}
