/**
 * Secrets store for transcription provider credentials entered via the UI.
 *
 * Persists a small JSON file under the runtime data root so the Desktop and
 * Server layouts resolve it consistently (see runtime-paths). Values are
 * merged into `process.env` at startup (via instrumentation) and on each save
 * so the existing `factory.ts` / `setup-readiness.ts` keep reading
 * `process.env` unchanged.
 *
 * Security posture (mirrors setup-readiness.ts): the key *values* are never
 * returned to the browser — only a boolean "configured" flag per provider.
 */
import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { resolveLayout, secretsFile } from "@/lib/runtime-paths";

/** Supported transcription providers and the env var holding each one's key. */
export const PROVIDER_KEY_VARS = {
  deepgram: "DEEPGRAM_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
} as const;

export type ProviderId = keyof typeof PROVIDER_KEY_VARS;

export const PROVIDER_IDS = Object.keys(PROVIDER_KEY_VARS) as ProviderId[];

/** Additional env vars this store is allowed to manage. */
const EXTRA_VARS = ["TRANSCRIPTION_PROVIDER", "OPENAI_BASE_URL"] as const;

/** Every env var name this module may touch. Used to scope merges/writes. */
const MANAGED_VARS = new Set<string>([
  ...Object.values(PROVIDER_KEY_VARS),
  ...EXTRA_VARS,
]);

/** Raw shape of secrets.json (only known keys are honored). */
export interface SecretsValues {
  TRANSCRIPTION_PROVIDER?: string;
  DEEPGRAM_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_BASE_URL?: string;
}

/** Resolve the secrets file path for the active runtime layout. */
export function secretsPath(): string {
  return secretsFile(resolveLayout().root);
}

/**
 * Read and parse secrets.json. Returns `{}` for a missing file (ENOENT) so
 * first-run state is indistinguishable from "not yet configured" — the same
 * pattern used by the symphony state route. Throws on any other IO/parse
 * error so callers can surface real problems.
 */
export async function readSecretsFile(): Promise<SecretsValues> {
  const file = secretsPath();
  try {
    const content = await readFile(file, "utf8");
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return pickManaged(parsed as Record<string, unknown>);
    }
    return {};
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT") return {};
    throw error;
  }
}

/** Keep only managed keys with string values, drop everything else. */
function pickManaged(input: Record<string, unknown>): SecretsValues {
  const out: SecretsValues = {};
  for (const [key, value] of Object.entries(input)) {
    if (MANAGED_VARS.has(key) && typeof value === "string") {
      (out as Record<string, string>)[key] = value;
    }
  }
  return out;
}

/**
 * Merge secrets.json values into `process.env` (only non-empty values win, so
 * an empty string in the file cannot clobber a value already in env). Called
 * once from instrumentation at startup, before any route module loads.
 *
 * Accepts an explicit `env` target for tests; defaults to `process.env`.
 */
export async function loadSecretsIntoEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const values = await readSecretsFile();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim()) {
      env[key] = value;
    }
  }
}

/**
 * Atomically persist the full secrets set. Writes a temp file in the same
 * directory then renames, matching the upload route's partial+rename pattern.
 * Missing directory is created on demand.
 */
export async function writeSecrets(values: SecretsValues): Promise<void> {
  const file = secretsPath();
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true });
  const payload = pickManaged(values as Record<string, unknown>);
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, JSON.stringify(payload, null, 2), { encoding: "utf8", mode: 0o600 });
  try {
    await rename(tmp, file);
  } catch (error) {
    // Clean up the orphaned temp file; surface the original rename failure.
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
}

/**
 * Apply a provider/key/baseUrl update to both process.env (immediate effect)
 * and the persisted file. Other providers' keys are preserved untouched.
 */
export async function saveProviderConfig(input: {
  provider: ProviderId;
  apiKey: string;
  baseUrl?: string;
}): Promise<void> {
  const current = await readSecretsFile();
  const next: SecretsValues = {
    ...current,
    TRANSCRIPTION_PROVIDER: input.provider,
    [PROVIDER_KEY_VARS[input.provider]]: input.apiKey,
  };
  // OPENAI_BASE_URL only applies to the openai provider; clear it otherwise
  // so factory.ts falls back to the default endpoint.
  if (input.provider === "openai" && input.baseUrl && input.baseUrl.trim()) {
    next.OPENAI_BASE_URL = input.baseUrl.trim();
  } else {
    next.OPENAI_BASE_URL = "";
  }
  await writeSecrets(next);
  // Reflect into the live process so the next request picks it up.
  applyToEnv(next, process.env);
  // OPENAI_BASE_URL is only meaningful for the openai provider. When cleared
  // (empty in the file), drop it from env so factory.ts falls back to the
  // default endpoint instead of keeping a stale value from a prior config.
  if (!next.OPENAI_BASE_URL || !next.OPENAI_BASE_URL.trim()) {
    delete process.env.OPENAI_BASE_URL;
  }
}

function applyToEnv(values: SecretsValues, env: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim()) {
      env[key] = value;
    }
  }
}

/** Masked, browser-safe summary — never contains key values. */
export interface ProviderSummary {
  provider: ProviderId;
  configured: Record<ProviderId, boolean>;
  hasBaseUrl: boolean;
}

/**
 * Return a masked summary of the current provider state, reading from
 * `process.env` (which reflects both .env and the merged secrets.json).
 */
export function getProviderSummary(
  env: Record<string, string | undefined> = process.env,
): ProviderSummary {
  const rawProvider = (env.TRANSCRIPTION_PROVIDER || "deepgram").toLowerCase();
  const provider: ProviderId = (
    PROVIDER_IDS.includes(rawProvider as ProviderId) ? rawProvider : "deepgram"
  ) as ProviderId;
  return {
    provider,
    configured: {
      deepgram: Boolean(env.DEEPGRAM_API_KEY?.trim()),
      openai: Boolean(env.OPENAI_API_KEY?.trim()),
      google: Boolean(env.GOOGLE_API_KEY?.trim()),
    },
    hasBaseUrl: Boolean(env.OPENAI_BASE_URL?.trim()),
  };
}
