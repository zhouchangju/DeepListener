/**
 * Bounded diagnostics for ordinary learners and support workflows.
 *
 * The public document is an allow-list, not a dump of process.env, Prisma,
 * logs, or the data root. It reports categorical readiness states and a small
 * set of redacted startup events. No transcript, note, media bytes, database
 * rows, credential value, authorization token, or absolute path is included.
 */
import { randomUUID } from "node:crypto";
import { access, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  databaseFile,
  logsDirectory as runtimeLogsDirectory,
  mediaDirectoryFor,
  resolveLayout,
  runtimeStateDirectory,
  type RuntimeLayout,
} from "./runtime-paths";
import {
  getProviderSummary,
  readSecretsFile,
  type ProviderId,
  type ProviderSummary,
  type SecretsValues,
} from "./secrets-store";

export const DIAGNOSTICS_SCHEMA_VERSION = 1 as const;
const DEFAULT_MAX_LOG_BYTES = 64 * 1024;
const DEFAULT_MAX_LOG_LINES = 100;
const PRIVATE_ROOT = "<private-data-root>";

export type DiagnosticStatus = "ready" | "action" | "unknown";

export interface DiagnosticsSnapshot {
  schemaVersion: typeof DIAGNOSTICS_SCHEMA_VERSION;
  generatedAt: string;
  app: { version?: string };
  runtime: {
    mode: RuntimeLayout["mode"];
    explicitDataRoot: boolean;
    paths: {
      dataRoot: typeof PRIVATE_ROOT;
      database: "<private-data-root>/database/deeplistener.db" | "<private-data-root>/prisma/dev.db";
      audio: "<private-data-root>/media/audio" | "<private-data-root>/public/uploads";
      video: "<private-data-root>/media/video" | "<private-data-root>/public/videos";
    };
  };
  checks: {
    dataRoot: DiagnosticStatus;
    database: DiagnosticStatus;
    audioDirectory: DiagnosticStatus;
    videoDirectory: DiagnosticStatus;
    logsDirectory: DiagnosticStatus;
  };
  provider: {
    selected: ProviderId;
    configured: Record<ProviderId, boolean>;
    baseUrlConfigured: boolean;
    connectivity: "not-tested";
  };
  startup: {
    previousFailure?: { code: string; phase: string; occurredAt: string };
  };
  logs: {
    includedLines: string[];
    truncated: boolean;
  };
}

export interface DiagnosticsInput {
  layout?: RuntimeLayout;
  provider?: ProviderSummary;
  secretValues?: SecretsValues;
  appVersion?: string;
  now?: Date;
  maxLogBytes?: number;
  maxLogLines?: number;
}

export interface WriteDiagnosticsInput extends DiagnosticsInput {
  destination: string;
}

const SENSITIVE_LOG_TERMS = /transcript|fulltext|sentence|note|media|audio|video|payload|content|words|text|credential|api[_-]?key|authorization|bearer/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Redact known secret values, token-like fields, and common absolute paths. */
export function redactDiagnosticText(input: string, secrets: string[] = []): string {
  let text = String(input);
  for (const secret of secrets) {
    const value = secret.trim();
    if (value.length >= 4) text = text.replace(new RegExp(escapeRegex(value), "g"), "<redacted>");
  }
  return text
    .replace(/((?:api[_-]?key|secret|password|authorization|credential|token)[=:]\s*)(Bearer\s+)?[^\s,}"']+/gi, "$1$2<redacted>")
    .replace(/(bearer\s+)[^\s,}"']+/gi, "$1<redacted>")
    .replace(/(?:file:\/\/\/)?[A-Za-z]:[\\/][^\s,)}\]"']+|\/(?:Users|home|private|var|tmp|mnt|opt)\/[^\s,)}\]"']+/g, "<private-path>");
}

function statusFor(exists: boolean, readable: boolean, writable: boolean): DiagnosticStatus {
  if (!exists) return "action";
  if (!readable || !writable) return "action";
  return "ready";
}

async function inspectDirectory(directory: string): Promise<{ exists: boolean; readable: boolean; writable: boolean }> {
  try {
    const info = await stat(directory);
    if (!info.isDirectory()) return { exists: true, readable: false, writable: false };
    const [readable, writable] = await Promise.all([
      access(directory).then(() => true).catch(() => false),
      access(directory, 2).then(() => true).catch(() => false),
    ]);
    return { exists: true, readable, writable };
  } catch {
    return { exists: false, readable: false, writable: false };
  }
}

async function inspectFile(filePath: string): Promise<{ exists: boolean; readable: boolean; writable: boolean }> {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return { exists: true, readable: false, writable: false };
    const [readable, writable] = await Promise.all([
      access(filePath).then(() => true).catch(() => false),
      access(filePath, 2).then(() => true).catch(() => false),
    ]);
    return { exists: true, readable, writable };
  } catch {
    return { exists: false, readable: false, writable: false };
  }
}

function logicalPath(layout: RuntimeLayout, kind: "database" | "audio" | "video"): DiagnosticsSnapshot["runtime"]["paths"][keyof DiagnosticsSnapshot["runtime"]["paths"]] {
  if (kind === "database") return layout.mode === "desktop" ? `${PRIVATE_ROOT}/database/deeplistener.db` : `${PRIVATE_ROOT}/prisma/dev.db`;
  if (kind === "audio") return layout.mode === "desktop" ? `${PRIVATE_ROOT}/media/audio` : `${PRIVATE_ROOT}/public/uploads`;
  return layout.mode === "desktop" ? `${PRIVATE_ROOT}/media/video` : `${PRIVATE_ROOT}/public/videos`;
}

function isSafeLogLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || SENSITIVE_LOG_TERMS.test(trimmed)) return false;
  // Keep only bounded, structured operational events. Free-form renderer
  // output is excluded because it may contain the learner's sentence text.
  return /^\[(?:instrumentation|startup|service|desktop|diagnostics)\]/i.test(trimmed);
}

async function readSafeLogLines(
  directory: string,
  secrets: string[],
  maxBytes: number,
  maxLines: number,
): Promise<{ lines: string[]; truncated: boolean }> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [] as Array<{ name: string; mtimeMs: number }>;
    for (const entry of entries) {
      if (!entry.isFile() || !/\.log$/i.test(entry.name)) continue;
      try {
        files.push({ name: entry.name, mtimeMs: (await stat(path.join(directory, entry.name))).mtimeMs });
      } catch {
        // Ignore a file removed during collection.
      }
    }
    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const lines: string[] = [];
    let bytes = 0;
    let truncated = false;
    for (const file of files) {
      if (bytes >= maxBytes || lines.length >= maxLines) {
        truncated = true;
        break;
      }
      const raw = await readFile(path.join(directory, file.name), { encoding: "utf8" }).catch(() => "");
      const remaining = Math.max(0, maxBytes - bytes);
      const bounded = raw.slice(-remaining);
      bytes += Buffer.byteLength(bounded, "utf8");
      for (const line of bounded.split(/\r?\n/).slice(-maxLines)) {
        if (!isSafeLogLine(line)) continue;
        lines.push(redactDiagnosticText(line, secrets));
        if (lines.length >= maxLines) {
          truncated = true;
          break;
        }
      }
    }
    return { lines: lines.slice(-maxLines), truncated };
  } catch {
    return { lines: [], truncated: false };
  }
}

async function readPreviousFailure(root: string, secrets: string[]): Promise<DiagnosticsSnapshot["startup"]["previousFailure"]> {
  try {
    const raw = JSON.parse(await readFile(path.join(runtimeStateDirectory(root), "startup-failure.json"), "utf8")) as Record<string, unknown>;
    if (typeof raw.code !== "string" || typeof raw.phase !== "string" || typeof raw.occurredAt !== "string") return undefined;
    return {
      code: redactDiagnosticText(raw.code, secrets).slice(0, 80),
      phase: redactDiagnosticText(raw.phase, secrets).slice(0, 80),
      occurredAt: raw.occurredAt.slice(0, 64),
    };
  } catch {
    return undefined;
  }
}

/** Persist only a categorical startup failure summary; raw errors stay out. */
export async function recordStartupFailure(input: { root: string; code: string; phase: string; occurredAt?: Date }): Promise<void> {
  const directory = runtimeStateDirectory(input.root);
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, "startup-failure.json");
  const temporary = `${target}.tmp-${randomUUID()}`;
  await writeFile(
    temporary,
    `${JSON.stringify({ code: input.code.slice(0, 80), phase: input.phase.slice(0, 80), occurredAt: (input.occurredAt ?? new Date()).toISOString() })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await rename(temporary, target).catch(async (error) => {
    await writeFile(target, await readFile(temporary));
    await import("node:fs/promises").then(({ unlink }) => unlink(temporary).catch(() => undefined));
    throw error;
  });
}

export async function clearStartupFailure(root: string): Promise<void> {
  await import("node:fs/promises").then(({ unlink }) => unlink(path.join(runtimeStateDirectory(root), "startup-failure.json")).catch(() => undefined));
}

/** Collect a safe, bounded diagnostics snapshot. */
export async function collectDiagnostics(input: DiagnosticsInput = {}): Promise<DiagnosticsSnapshot> {
  const layout = input.layout ?? resolveLayout();
  const provider = input.provider ?? getProviderSummary();
  const secrets = input.secretValues
    ? Object.values(input.secretValues).filter((value): value is string => typeof value === "string")
    : await readSecretsFile().then((values) => Object.values(values).filter((value): value is string => typeof value === "string")).catch(() => []);
  const root = await inspectDirectory(layout.root);
  const db = await inspectFile(databaseFile(layout.root, layout.mode));
  const audio = await inspectDirectory(mediaDirectoryFor("audio", layout.root, layout.mode));
  const video = await inspectDirectory(mediaDirectoryFor("video", layout.root, layout.mode));
  const logs = await inspectDirectory(runtimeLogsDirectory(layout.root));
  const logLines = await readSafeLogLines(
    runtimeLogsDirectory(layout.root),
    secrets,
    input.maxLogBytes ?? DEFAULT_MAX_LOG_BYTES,
    input.maxLogLines ?? DEFAULT_MAX_LOG_LINES,
  );
  const previousFailure = await readPreviousFailure(layout.root, secrets);
  const snapshot: DiagnosticsSnapshot = {
    schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
    generatedAt: (input.now ?? new Date()).toISOString(),
    app: input.appVersion ? { version: input.appVersion } : {},
    runtime: {
      mode: layout.mode,
      explicitDataRoot: layout.mode === "desktop",
      paths: {
        dataRoot: PRIVATE_ROOT,
        database: logicalPath(layout, "database") as DiagnosticsSnapshot["runtime"]["paths"]["database"],
        audio: logicalPath(layout, "audio") as DiagnosticsSnapshot["runtime"]["paths"]["audio"],
        video: logicalPath(layout, "video") as DiagnosticsSnapshot["runtime"]["paths"]["video"],
      },
    },
    checks: {
      dataRoot: statusFor(root.exists, root.readable, root.writable),
      database: statusFor(db.exists, db.readable, db.writable),
      audioDirectory: statusFor(audio.exists, audio.readable, audio.writable),
      videoDirectory: statusFor(video.exists, video.readable, video.writable),
      logsDirectory: statusFor(logs.exists, logs.readable, logs.writable),
    },
    provider: {
      selected: provider.provider,
      configured: provider.configured,
      baseUrlConfigured: provider.hasBaseUrl,
      connectivity: "not-tested",
    },
    startup: { ...(previousFailure ? { previousFailure } : {}) },
    logs: { includedLines: logLines.lines, truncated: logLines.truncated },
  };
  return snapshot;
}

/** Serialize a snapshot with stable indentation for support attachments. */
export function serializeDiagnostics(snapshot: DiagnosticsSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

/** Write a redacted diagnostics export atomically to an explicit destination. */
export async function writeDiagnosticsExport(input: WriteDiagnosticsInput): Promise<{ ok: true; path: string } | { ok: false; reason: "destination-invalid" | "write-failed" }> {
  if (!path.isAbsolute(input.destination)) return { ok: false, reason: "destination-invalid" };
  const destination = path.resolve(input.destination);
  const temporary = `${destination}.tmp-${randomUUID()}`;
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    const snapshot = await collectDiagnostics(input);
    await writeFile(temporary, serializeDiagnostics(snapshot), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, destination);
    return { ok: true, path: destination };
  } catch {
    await import("node:fs/promises").then(({ unlink }) => unlink(temporary).catch(() => undefined));
    return { ok: false, reason: "write-failed" };
  }
}
