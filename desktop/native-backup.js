/**
 * Native Desktop adapter for the transparent manifest-backed backup bundle.
 *
 * The renderer never supplies a path. Electron's main process receives a
 * native-dialog result, copies only into a generated child directory, and
 * verifies every manifest entry after the copy. This module is intentionally
 * independent of Prisma/Next so it can run in the packaged shell.
 */
const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");
const {
  access,
  cp,
  lstat,
  mkdir,
  readFile,
  rm,
} = require("node:fs/promises");
const path = require("node:path");

const BACKUP_FORMAT = "deeplistener-backup";
const BACKUP_VERSION = 1;
const MANIFEST_NAME = "manifest.json";
const SHA256_RE = /^[a-f0-9]{64}$/;

function isAbsolute(value) {
  return typeof value === "string" && path.isAbsolute(value);
}

function isSafeRelative(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0")) return false;
  if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) return false;
  return value.split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

function containedPath(root, relative) {
  if (!isSafeRelative(relative)) return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, ...relative.split("/"));
  const prefix = `${resolvedRoot}${path.sep}`;
  return resolved === resolvedRoot || resolved.startsWith(prefix) ? resolved : null;
}

function isWithin(parent, child) {
  const resolvedParent = path.resolve(parent);
  const resolvedChild = path.resolve(child);
  const relative = path.relative(resolvedParent, resolvedChild);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath) {
  const digest = createHash("sha256");
  let size = 0;
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      digest.update(bytes);
    });
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return { size, sha256: digest.digest("hex") };
}

async function readManifest(bundlePath) {
  if (!isAbsolute(bundlePath)) return { ok: false, code: "SOURCE_INVALID" };
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(bundlePath, MANIFEST_NAME), "utf8"));
  } catch {
    return { ok: false, code: "INVALID_BACKUP" };
  }
  if (!manifest || manifest.format !== BACKUP_FORMAT || manifest.version !== BACKUP_VERSION || !Array.isArray(manifest.files) || manifest.files.length === 0) {
    return { ok: false, code: "INVALID_BACKUP" };
  }
  const paths = new Set();
  for (const entry of manifest.files) {
    if (!entry || !isSafeRelative(entry.path) || paths.has(entry.path) || !SHA256_RE.test(entry.sha256)) {
      return { ok: false, code: "INVALID_BACKUP" };
    }
    if (!Number.isSafeInteger(entry.size) || entry.size < 0 || !["database", "audio", "video"].includes(entry.kind)) {
      return { ok: false, code: "INVALID_BACKUP" };
    }
    paths.add(entry.path);
  }
  const database = manifest.files.filter((entry) => entry.kind === "database");
  if (database.length !== 1 || database[0].path !== "database/deeplistener.db") {
    return { ok: false, code: "INVALID_BACKUP" };
  }
  return { ok: true, manifest };
}

async function verifyBundle(bundlePath) {
  const result = await readManifest(bundlePath);
  if (!result.ok) return result;
  try {
    for (const entry of result.manifest.files) {
      const filePath = containedPath(bundlePath, entry.path);
      if (!filePath) return { ok: false, code: "INVALID_BACKUP" };
      const info = await lstat(filePath);
      if (!info.isFile()) return { ok: false, code: "INVALID_BACKUP" };
      const digest = await hashFile(filePath);
      if (digest.size !== entry.size || digest.sha256 !== entry.sha256) return { ok: false, code: "INTEGRITY_FAILED" };
    }
    return { ok: true, manifest: result.manifest };
  } catch {
    return { ok: false, code: "INVALID_BACKUP" };
  }
}

function folderNameForBackupId(backupId) {
  if (typeof backupId !== "string" || !/^backup-[A-Za-z0-9-]+$/.test(backupId)) return null;
  return `deeplistener-backup-${backupId.slice("backup-".length)}`;
}

async function copyBundle(sourcePath, destinationPath) {
  if (!isAbsolute(sourcePath) || !isAbsolute(destinationPath)) return { ok: false, code: "PATH_INVALID" };
  if (path.resolve(sourcePath) === path.resolve(destinationPath) || isWithin(sourcePath, destinationPath)) {
    return { ok: false, code: "PATH_INVALID" };
  }
  if (await exists(destinationPath)) return { ok: false, code: "DESTINATION_EXISTS" };
  try {
    const sourceInfo = await lstat(sourcePath);
    if (!sourceInfo.isDirectory() || sourceInfo.isSymbolicLink()) return { ok: false, code: "SOURCE_INVALID" };
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
    const verification = await verifyBundle(destinationPath);
    if (!verification.ok) throw new Error(verification.code);
    return { ok: true, manifest: verification.manifest };
  } catch {
    await rm(destinationPath, { recursive: true, force: true }).catch(() => undefined);
    return { ok: false, code: "COPY_FAILED" };
  }
}

async function exportBundle(sourcePath, parentPath, backupId) {
  const folderName = folderNameForBackupId(backupId);
  if (!folderName || !isAbsolute(parentPath)) return { ok: false, code: "PATH_INVALID" };
  return copyBundle(sourcePath, path.join(parentPath, folderName));
}

async function stageBundle(sourcePath, stagingPath) {
  if (!isAbsolute(sourcePath) || !isAbsolute(stagingPath)) return { ok: false, code: "PATH_INVALID" };
  if (path.resolve(sourcePath) === path.resolve(stagingPath) || isWithin(sourcePath, stagingPath) || isWithin(stagingPath, sourcePath)) {
    return { ok: false, code: "PATH_INVALID" };
  }
  const result = await copyBundle(sourcePath, stagingPath);
  if (!result.ok) return result;
  return { ok: true, manifest: result.manifest };
}

async function removeOwnedDirectory(directory) {
  if (!isAbsolute(directory)) return false;
  await rm(directory, { recursive: true, force: true });
  return true;
}

module.exports = {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MANIFEST_NAME,
  exportBundle,
  folderNameForBackupId,
  readManifest,
  removeOwnedDirectory,
  stageBundle,
  verifyBundle,
};
