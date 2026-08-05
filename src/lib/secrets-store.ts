/**
 * Secrets store for transcription provider credentials entered via the UI.
 *
 * Persists credentials in the configured local backend: a small JSON file for
 * Server/dev layouts, or one macOS Keychain item for the packaged Desktop
 * client. Values are merged into `process.env` at startup (via
 * instrumentation) and on each save so the existing `factory.ts` /
 * `setup-readiness.ts` keep reading `process.env` unchanged.
 *
 * Security posture (mirrors setup-readiness.ts): the key *values* are never
 * returned to the browser — only a boolean "configured" flag per provider.
 */
import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { resolveLayout, secretsFile } from "@/lib/runtime-paths";
import {
  DEFAULT_SETTINGS,
  readSettings,
  readSettingsFile,
  updateSettings,
  type ProviderVerificationStatus,
} from "@/lib/settings-store";
import {
  createSecretStore,
  type SecretBackend as CredentialSecretBackend,
  type SecretStoreService,
} from "@/lib/secret-store-service";

/** Supported transcription providers and the env var holding each one's key. */
export const PROVIDER_KEY_VARS = {
  deepgram: "DEEPGRAM_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
} as const;

export type ProviderId = keyof typeof PROVIDER_KEY_VARS;

/** Safe provider state exposed to setup/recovery surfaces. */
export type ProviderStatus = "missing" | ProviderVerificationStatus;

export const PROVIDER_IDS = Object.keys(PROVIDER_KEY_VARS) as ProviderId[];

/** Additional env vars this store is allowed to manage. */
const EXTRA_VARS = ["TRANSCRIPTION_PROVIDER", "OPENAI_BASE_URL"] as const;

/** Every env var name this module may touch. Used to scope merges/writes. */
const MANAGED_VARS = new Set<string>([
  ...Object.values(PROVIDER_KEY_VARS),
  ...EXTRA_VARS,
]);

const execFileAsync = promisify(execFile);
const KEYCHAIN_SERVICE = "io.zhouchangju.deeplistener.credentials";
const KEYCHAIN_ACCOUNT = "default";

export type SecretBackend = "file" | "keychain";

/**
 * Desktop enables the macOS Keychain backend before the standalone service is
 * spawned. Server/dev/test layouts remain file-backed and deterministic.
 */
export function secretBackend(
  env: Readonly<Record<string, string | undefined>> = process.env,
): SecretBackend {
  return process.platform === "darwin" && env.DEEPLISTENER_SECRET_BACKEND === "keychain"
    ? "keychain"
    : "file";
}

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
  if (secretBackend() === "keychain") {
    const keychainValues = await readKeychainSecret();
    if (keychainValues) return keychainValues;
    // One-time compatibility path: an existing file-backed profile remains
    // readable and is moved to Keychain on the next provider save.
  }
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
 * Atomically persist the full secrets set. The file backend writes a temp file
 * in the same directory then renames, matching the upload route's
 * partial+rename pattern. The Keychain backend replaces one generic password
 * item and removes any legacy plaintext file only after that write succeeds.
 * Missing directories are created on demand for the file backend.
 */
export async function writeSecrets(values: SecretsValues): Promise<void> {
  const payload = pickManaged(values as Record<string, unknown>);
  if (secretBackend() === "keychain") {
    await writeKeychainSecret(payload);
    await unlink(secretsPath()).catch((error: unknown) => {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code !== "ENOENT") {
        throw new Error("Unable to remove the legacy DeepListener credentials file.");
      }
    });
    return;
  }
  const file = secretsPath();
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true });
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

/** Read the single JSON Keychain item used by the packaged macOS client. */
async function readKeychainSecret(): Promise<SecretsValues | null> {
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/security",
      ["find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"],
      { encoding: "utf8", timeout: 3_000, maxBuffer: 64 * 1024 },
    );
    const parsed: unknown = JSON.parse(stdout.trim());
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? pickManaged(parsed as Record<string, unknown>)
      : {};
  } catch (error: unknown) {
    if (isMissingKeychainItem(error)) return null;
    throw new Error("Unable to read DeepListener credentials from macOS Keychain.");
  }
}

/** Atomically replace the single JSON Keychain item; values never enter logs. */
async function writeKeychainSecret(values: SecretsValues): Promise<void> {
  try {
    await execFileAsync(
      "/usr/bin/security",
      [
        "add-generic-password",
        "-U",
        "-a",
        KEYCHAIN_ACCOUNT,
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
        JSON.stringify(values),
      ],
      { encoding: "utf8", timeout: 3_000, maxBuffer: 16 * 1024 },
    );
  } catch {
    throw new Error("Unable to save DeepListener credentials to macOS Keychain.");
  }
}

function isMissingKeychainItem(error: unknown): boolean {
  const candidate = error as { code?: number | string; stderr?: string; message?: string };
  const text = `${candidate.stderr ?? ""} ${candidate.message ?? ""}`.toLowerCase();
  return candidate.code === 44 || text.includes("could not be found") || text.includes("item not found");
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
  // Provider selection and routing policy are non-secret settings. Persist
  // them in the dedicated versioned settings document before writing the
  // credential file; the legacy secrets fields remain readable for existing
  // profiles and are retained by writeSecrets for compatibility.
  await updateSettings({
    selectedProvider: input.provider,
    openaiBaseUrl: next.OPENAI_BASE_URL || "",
    providerVerification: { [input.provider]: "unverified" },
  });
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

/**
 * Remove one provider credential from the active local backend. The selected
 * provider marker is intentionally retained so readiness can explain which
 * service needs attention after removal. OpenAI's optional base URL is
 * removed with its credential because it has no meaning without that key.
 */
export async function removeProviderConfig(provider: ProviderId): Promise<void> {
  const current = await readSecretsFile();
  const next: SecretsValues = { ...current };
  delete next[PROVIDER_KEY_VARS[provider]];
  if (provider === "openai") delete next.OPENAI_BASE_URL;
  await writeSecrets(next);

  delete process.env[PROVIDER_KEY_VARS[provider]];
  if (provider === "openai") delete process.env.OPENAI_BASE_URL;
  await setProviderVerificationStatus(provider, "unknown");
}

/**
 * Create the server-side credential service over the currently selected
 * backend. The returned service exposes redacted state and operation-scoped
 * access only; it has no credential read-back method.
 */
export function createProviderSecretStore(): SecretStoreService {
  const backend: CredentialSecretBackend = {
    read: async (provider) => {
      const values = await readSecretsFile();
      return values[PROVIDER_KEY_VARS[provider]];
    },
    write: async (provider, value) => {
      const current = await readSecretsFile();
      await writeSecrets({
        ...current,
        [PROVIDER_KEY_VARS[provider]]: value,
      });
    },
    remove: async (provider) => {
      const current = await readSecretsFile();
      delete current[PROVIDER_KEY_VARS[provider]];
      await writeSecrets(current);
    },
  };
  return createSecretStore(backend);
}

/** Browser-safe provider credential state for server-side callers. */
export async function getProviderSecretState(provider: ProviderId) {
  return createProviderSecretStore().status(provider);
}

/** Persist a categorical connectivity result; never persist the credential. */
export async function setProviderVerificationStatus(
  provider: ProviderId,
  status: ProviderVerificationStatus,
): Promise<void> {
  const loaded = await readSettingsFile();
  const current = loaded.settings;
  const selectedProvider = loaded.exists ? current.selectedProvider : getProviderSummary().provider;
  await updateSettings({
    selectedProvider,
    providerVerification: { ...current.providerVerification, [provider]: status },
  });
}

/** Run a server-side operation with only the selected provider credential. */
export async function withProviderCredential<T>(
  provider: ProviderId,
  operation: (credential: string) => Promise<T> | T,
): Promise<T> {
  try {
    return await createProviderSecretStore().withCredential(provider, operation);
  } catch (error) {
    // Server deployments may still configure credentials through `.env`.
    // Fall back only to the explicitly selected provider's variable; never
    // expose or assemble the complete credential set for an operation.
    const envValue = process.env[PROVIDER_KEY_VARS[provider]];
    if (envValue?.trim()) return await operation(envValue);
    throw error;
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
  /** Always redacted; optional for compatibility with injected test summaries. */
  status?: Record<ProviderId, ProviderStatus>;
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
    status: {
      deepgram: env.DEEPGRAM_API_KEY?.trim() ? "unverified" : "missing",
      openai: env.OPENAI_API_KEY?.trim() ? "unverified" : "missing",
      google: env.GOOGLE_API_KEY?.trim() ? "unverified" : "missing",
    },
  };
}

/**
 * Read persisted verification states for status-bearing API/UI callers.
 * Legacy profiles without a settings file remain usable and are reported as
 * unverified when a credential is present.
 */
export async function getProviderSummaryAsync(
  env: Record<string, string | undefined> = process.env,
): Promise<ProviderSummary> {
  const summary = getProviderSummary(env);
  const settings = await readSettings();
  const persisted = settings.providerVerification ?? DEFAULT_SETTINGS.providerVerification;
  return {
    ...summary,
    status: {
      deepgram: summary.configured.deepgram ? (persisted.deepgram ?? "unverified") : "missing",
      openai: summary.configured.openai ? (persisted.openai ?? "unverified") : "missing",
      google: summary.configured.google ? (persisted.google ?? "unverified") : "missing",
    },
  };
}
