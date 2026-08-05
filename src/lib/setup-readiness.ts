import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { resolveLayout, databaseFile, uploadsDirectory, videosDirectory } from "@/lib/runtime-paths";

export type ReadinessStatus = "ready" | "action" | "limited";

export type ReadinessCheckId = "runtime" | "database" | "media" | "ffmpeg" | "provider";

/**
 * A readiness check carries stable translation keys (resolved by the caller
 * via next-intl) instead of hardcoded strings, plus ICU placeholder values
 * for dynamic parts (versions, provider names, env var names).
 */
export interface ReadinessCheck {
  id: ReadinessCheckId;
  status: ReadinessStatus;
  detailKey: string;
  fixKey?: string;
  values?: Record<string, string | number>;
}

export interface ReadinessDependencies {
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  nodeVersion: string;
  canAccess: (target: string, mode: number) => Promise<boolean>;
  hasCommand: (command: string) => Promise<boolean>;
}

const execFileAsync = promisify(execFile);

async function canAccess(target: string, mode: number) {
  try {
    await access(target, mode);
    return true;
  } catch {
    return false;
  }
}

async function hasCommand(command: string) {
  try {
    await execFileAsync(command, ["-version"], { timeout: 3_000 });
    return true;
  } catch {
    return false;
  }
}

async function isWritableOrCreatable(
  target: string,
  parent: string,
  canAccessTarget: ReadinessDependencies["canAccess"],
) {
  const exists = await canAccessTarget(target, constants.F_OK);
  if (exists) return canAccessTarget(target, constants.W_OK);

  // A clean Desktop profile commonly has neither `<root>/media` nor its
  // `audio`/`video` children yet. Readiness must stay read-only, so walk up to
  // the nearest existing ancestor and check whether the app could create the
  // missing path there instead of treating an absent immediate parent as a
  // blocker.
  let candidate = parent;
  while (true) {
    if (await canAccessTarget(candidate, constants.F_OK)) {
      return canAccessTarget(candidate, constants.W_OK);
    }
    const next = path.dirname(candidate);
    if (next === candidate) return false;
    candidate = next;
  }
}

function isSupportedNode(version: string) {
  // The bundled migration runner relies on Node's built-in `node:sqlite`
  // (DatabaseSync), which requires Node 22+. Reporting Ready on older runtimes
  // would let the desktop migration path fail at runtime instead of at the
  // readiness gate.
  const [major = 0] = version.split(".").map(Number);
  return major >= 22;
}

interface DatabaseReadiness {
  status: ReadinessStatus;
  detailKey: string;
  fixKey?: string;
}

function createDependencies(overrides: Partial<ReadinessDependencies>): ReadinessDependencies {
  return {
    cwd: overrides.cwd ?? process.cwd(),
    env: overrides.env ?? process.env,
    nodeVersion: overrides.nodeVersion ?? process.versions.node,
    canAccess: overrides.canAccess ?? canAccess,
    hasCommand: overrides.hasCommand ?? hasCommand,
  };
}

/**
 * Evaluate database readiness using the runtime-resolved path (W2 T112).
 *
 * Distinguishes readable from writable (FR-061 / DCS-006): a read-only
 * database is never reported Ready. Uses runtime-paths so an explicit
 * Desktop data root (`DEEPLISTENER_DATA_DIR`) resolves correctly, while the
 * Server legacy layout (`DATABASE_URL=file:./dev.db` under cwd) is preserved.
 */
async function evaluateDatabase(
  deps: ReadinessDependencies,
): Promise<DatabaseReadiness> {
  const layout = resolveLayout(deps.env, deps.cwd);
  const dbPath = databaseFile(layout.root, layout.mode);

  const readable = await deps.canAccess(dbPath, constants.R_OK);
  if (!readable) {
    return {
      status: "action",
      detailKey: layout.mode === "desktop"
        ? "readiness.database.desktopMissingDetail"
        : "readiness.database.serverMissingDetail",
      fixKey: layout.mode === "desktop"
        ? "readiness.database.desktopMissingFix"
        : "readiness.database.serverMissingFix",
    };
  }

  // FR-061: a read-only database must NOT be reported Ready.
  const writable = await deps.canAccess(dbPath, constants.W_OK);
  if (!writable) {
    return {
      status: "action",
      detailKey: "readiness.database.readonlyDetail",
      fixKey: "readiness.database.readonlyFix",
    };
  }

  return {
    status: "ready",
    detailKey: layout.mode === "desktop"
      ? "readiness.database.desktopReadyDetail"
      : "readiness.database.serverReadyDetail",
  };
}

/**
 * Cheap, read-only database gate for server pages that require Prisma data.
 * It deliberately checks only the resolved database path, so a blocked route
 * can offer Setup recovery without probing providers or invoking Prisma.
 */
export async function evaluateDatabaseReadiness(
  overrides: Partial<ReadinessDependencies> = {},
): Promise<ReadinessCheck> {
  const check = await evaluateDatabase(createDependencies(overrides));
  return {
    id: "database",
    status: check.status,
    detailKey: check.detailKey,
    fixKey: check.fixKey,
  };
}

function getProviderCheck(env: Readonly<Record<string, string | undefined>>): ReadinessCheck {
  const provider = (env.TRANSCRIPTION_PROVIDER || "deepgram").toLowerCase();
  const keyNames: Record<string, string> = {
    deepgram: "DEEPGRAM_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
  };
  const keyName = keyNames[provider];

  if (!keyName) {
    return {
      id: "provider",
      status: "action",
      detailKey: "readiness.provider.unsupportedDetail",
      fixKey: "readiness.provider.unsupportedFix",
      values: { provider },
    };
  }

  if (!env[keyName]?.trim()) {
    return {
      id: "provider",
      status: "action",
      detailKey: "readiness.provider.missingDetail",
      fixKey: "readiness.provider.missingFix",
      values: { provider, keyName },
    };
  }

  return {
    id: "provider",
    status: "ready",
    detailKey: "readiness.provider.readyDetail",
    values: { provider },
  };
}

export async function evaluateSetupReadiness(
  overrides: Partial<ReadinessDependencies> = {},
): Promise<ReadinessCheck[]> {
  const dependencies = createDependencies(overrides);
  const { env, nodeVersion } = dependencies;
  const layout = resolveLayout(env, dependencies.cwd);
  const uploadDir = uploadsDirectory(layout.root, layout.mode);
  const videoDir = videosDirectory(layout.root, layout.mode);
  const publicOrMediaParent = path.dirname(uploadDir);

  // Packaged Desktop passes a verified/failed asset status from the Electron
  // boundary. A failed status must not fall back to the host PATH; Server and
  // development layouts retain the existing command probe.
  const packagedAssetStatus = env.DEEPLISTENER_RUNTIME_ASSET_STATUS;
  const ffmpegProbe = packagedAssetStatus === "verified"
    ? Promise.resolve(true)
    : packagedAssetStatus === "missing"
      ? Promise.resolve(false)
      : dependencies.hasCommand("ffmpeg");
  const ffprobeProbe = packagedAssetStatus === "verified"
    ? Promise.resolve(true)
    : packagedAssetStatus === "missing"
      ? Promise.resolve(false)
      : dependencies.hasCommand("ffprobe");

  const [databaseCheck, uploadsWritable, videosWritable, ffmpegAvailable, ffprobeAvailable] = await Promise.all([
    evaluateDatabase(dependencies),
    isWritableOrCreatable(uploadDir, publicOrMediaParent, dependencies.canAccess),
    isWritableOrCreatable(videoDir, publicOrMediaParent, dependencies.canAccess),
    ffmpegProbe,
    ffprobeProbe,
  ]);
  const mediaWritable = uploadsWritable && videosWritable;

  return [
    isSupportedNode(nodeVersion)
      ? {
          id: "runtime",
          status: "ready",
          detailKey: "readiness.runtime.readyDetail",
          values: { version: nodeVersion },
        }
      : {
          id: "runtime",
          status: "action",
          detailKey: "readiness.runtime.actionDetail",
          fixKey: "readiness.runtime.actionFix",
          values: { version: nodeVersion },
        },
    {
      id: "database",
      status: databaseCheck.status,
      detailKey: databaseCheck.detailKey,
      fixKey: databaseCheck.fixKey,
    },
    mediaWritable
      ? {
          id: "media",
          status: "ready",
          detailKey: "readiness.media.readyDetail",
        }
      : {
          id: "media",
          status: "action",
          detailKey: "readiness.media.actionDetail",
          fixKey: "readiness.media.actionFix",
        },
    ffmpegAvailable && ffprobeAvailable
      ? {
          id: "ffmpeg",
          status: "ready",
          detailKey: "readiness.ffmpeg.readyDetail",
        }
      : {
          id: "ffmpeg",
          status: "limited",
          detailKey: "readiness.ffmpeg.limitedDetail",
          fixKey: "readiness.ffmpeg.limitedFix",
        },
    getProviderCheck(env),
  ];
}
