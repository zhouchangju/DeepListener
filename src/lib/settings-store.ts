/**
 * Versioned, non-secret settings storage.
 *
 * This document is deliberately separate from `secrets.json`. It contains
 * values that are safe to keep in a portable profile (provider selection,
 * update/demo state, and bounded diagnostics preferences), but never API keys,
 * tokens, passwords, or other credentials. Writes are staged beside the live
 * file and promoted with an atomic rename so an interrupted write cannot make
 * a previously valid profile unreadable.
 */
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolveLayout, settingsFile } from "@/lib/runtime-paths";

export const SETTINGS_SCHEMA_VERSION = 1 as const;

export type SettingsProvider = "deepgram" | "openai" | "google";
/** Non-secret result of an explicit provider connectivity action. */
export type ProviderVerificationStatus = "unknown" | "unverified" | "verified" | "invalid";
export type UpdateChannel = "stable" | "beta";
export type ThemePreference = "system" | "light" | "dark";
export type DemoStatus = "not-started" | "in-progress" | "completed" | "dismissed";
export type DiagnosticLogLevel = "error" | "warn" | "info" | "debug";

export interface DeepListenerSettings {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  selectedProvider: SettingsProvider;
  /** Optional OpenAI-compatible endpoint; never contains an API key. */
  openaiBaseUrl: string;
  /** Provider connectivity states; values never contain credentials. */
  providerVerification: Record<SettingsProvider, ProviderVerificationStatus>;
  updateChannel: UpdateChannel;
  ui: {
    theme: ThemePreference;
  };
  demo: {
    status: DemoStatus;
  };
  diagnostics: {
    logLevel: DiagnosticLogLevel;
    retentionDays: number;
  };
}

export type SettingsPatch = Partial<Omit<DeepListenerSettings, "schemaVersion" | "ui" | "demo" | "diagnostics" | "providerVerification">> & {
  ui?: Partial<DeepListenerSettings["ui"]>;
  demo?: Partial<DeepListenerSettings["demo"]>;
  diagnostics?: Partial<DeepListenerSettings["diagnostics"]>;
  providerVerification?: Partial<DeepListenerSettings["providerVerification"]>;
};

export const DEFAULT_SETTINGS: DeepListenerSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  selectedProvider: "deepgram",
  openaiBaseUrl: "",
  providerVerification: {
    deepgram: "unknown",
    openai: "unknown",
    google: "unknown",
  },
  updateChannel: "stable",
  ui: { theme: "system" },
  demo: { status: "not-started" },
  diagnostics: { logLevel: "info", retentionDays: 7 },
};

type RenameFile = (oldPath: string, newPath: string) => Promise<void>;

export interface SettingsStoreOptions {
  /** Test/deployment override; production resolves the active data root. */
  root?: string;
  /** Test-only explicit file path. The caller owns this path. */
  filePath?: string;
  /** Test hook for simulating an interrupted promotion. */
  renameFile?: RenameFile;
  /** Test hook for deterministic temporary-file names. */
  now?: () => number;
  /** Test hook for deterministic temporary-file names. */
  random?: () => number;
}

export type SettingsSource = "missing" | "valid" | "migrated" | "recovered";

export interface SettingsLoadResult {
  settings: DeepListenerSettings;
  exists: boolean;
  source: SettingsSource;
}

/** Resolve the active settings file without exposing any secret values. */
export function settingsPath(root = resolveLayout().root): string {
  return settingsFile(root);
}

function cloneDefaults(): DeepListenerSettings {
  return {
    schemaVersion: DEFAULT_SETTINGS.schemaVersion,
    selectedProvider: DEFAULT_SETTINGS.selectedProvider,
    openaiBaseUrl: DEFAULT_SETTINGS.openaiBaseUrl,
    providerVerification: { ...DEFAULT_SETTINGS.providerVerification },
    updateChannel: DEFAULT_SETTINGS.updateChannel,
    ui: { ...DEFAULT_SETTINGS.ui },
    demo: { ...DEFAULT_SETTINGS.demo },
    diagnostics: { ...DEFAULT_SETTINGS.diagnostics },
  };
}

function pathFor(options: SettingsStoreOptions = {}): string {
  return options.filePath ?? settingsPath(options.root ?? resolveLayout().root);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validProvider(value: unknown): SettingsProvider {
  return value === "openai" || value === "google" || value === "deepgram"
    ? value
    : DEFAULT_SETTINGS.selectedProvider;
}

function validProviderVerificationStatus(value: unknown): ProviderVerificationStatus {
  return value === "verified" || value === "unverified" || value === "invalid" || value === "unknown"
    ? value
    : "unknown";
}

function validUpdateChannel(value: unknown): UpdateChannel {
  return value === "beta" ? "beta" : DEFAULT_SETTINGS.updateChannel;
}

function validTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : DEFAULT_SETTINGS.ui.theme;
}

function validDemoStatus(value: unknown): DemoStatus {
  return value === "in-progress" || value === "completed" || value === "dismissed" || value === "not-started"
    ? value
    : DEFAULT_SETTINGS.demo.status;
}

function validLogLevel(value: unknown): DiagnosticLogLevel {
  return value === "error" || value === "warn" || value === "debug" || value === "info"
    ? value
    : DEFAULT_SETTINGS.diagnostics.logLevel;
}

/**
 * Accept only an HTTP(S) endpoint without embedded user information. The
 * value is a routing policy, not a credential, and is capped to keep settings
 * payloads bounded.
 */
function validOpenaiBaseUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2_048) return "";
  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) {
      return "";
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function validRetentionDays(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SETTINGS.diagnostics.retentionDays;
  return Math.min(30, Math.max(1, Math.round(value)));
}

/**
 * Convert an unknown JSON value to the current schema. Unknown fields are
 * discarded; in particular, credential-shaped fields can never be copied into
 * the persisted document. Missing or malformed values receive safe defaults.
 */
export function normalizeSettings(input: unknown): DeepListenerSettings {
  const raw = isRecord(input) ? input : {};
  const ui = isRecord(raw.ui) ? raw.ui : {};
  const demo = isRecord(raw.demo) ? raw.demo : {};
  const diagnostics = isRecord(raw.diagnostics) ? raw.diagnostics : {};
  const providerVerification = isRecord(raw.providerVerification) ? raw.providerVerification : {};

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    selectedProvider: validProvider(raw.selectedProvider ?? raw.provider ?? raw.TRANSCRIPTION_PROVIDER),
    openaiBaseUrl: validOpenaiBaseUrl(raw.openaiBaseUrl ?? raw.OPENAI_BASE_URL),
    providerVerification: {
      deepgram: validProviderVerificationStatus(providerVerification.deepgram),
      openai: validProviderVerificationStatus(providerVerification.openai),
      google: validProviderVerificationStatus(providerVerification.google),
    },
    updateChannel: validUpdateChannel(raw.updateChannel),
    ui: { theme: validTheme(ui.theme ?? raw.theme) },
    demo: { status: validDemoStatus(demo.status ?? raw.demoStatus) },
    diagnostics: {
      logLevel: validLogLevel(diagnostics.logLevel ?? raw.logLevel),
      retentionDays: validRetentionDays(diagnostics.retentionDays ?? raw.retentionDays),
    },
  };
}

/**
 * Parse current and pre-v1 documents. A missing schema version is treated as
 * the original unversioned shape, which makes the migration explicit instead
 * of silently accepting a future/unknown schema.
 */
export function parseSettings(input: unknown): { settings: DeepListenerSettings; source: Exclude<SettingsSource, "missing"> } {
  if (!isRecord(input)) return { settings: cloneDefaults(), source: "recovered" };

  const version = input.schemaVersion;
  if (version === SETTINGS_SCHEMA_VERSION) {
    return { settings: normalizeSettings(input), source: "valid" };
  }

  if (version === undefined || version === 0) {
    return { settings: normalizeSettings(input), source: "migrated" };
  }

  // Future versions are not safe to reinterpret. Keep the app usable with
  // defaults and let a later version own the migration.
  return { settings: cloneDefaults(), source: "recovered" };
}

/** Read settings, falling back to defaults for missing/corrupt documents. */
export async function readSettingsFile(options: SettingsStoreOptions = {}): Promise<SettingsLoadResult> {
  const file = pathFor(options);
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    const result = parseSettings(parsed);
    return { ...result, exists: true };
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT") {
      return { settings: cloneDefaults(), exists: false, source: "missing" };
    }
    // Settings are non-critical. A corrupt or temporarily unreadable file
    // must not block a learner from opening the app, and is never overwritten
    // by this read path.
    return { settings: cloneDefaults(), exists: true, source: "recovered" };
  }
}

export async function readSettings(options: SettingsStoreOptions = {}): Promise<DeepListenerSettings> {
  return (await readSettingsFile(options)).settings;
}

/**
 * Persist a sanitized settings document through temp + same-directory rename.
 * If promotion fails, the old live file remains untouched and the temp file is
 * best-effort cleaned up.
 */
export async function writeSettings(
  input: unknown,
  options: SettingsStoreOptions = {},
): Promise<DeepListenerSettings> {
  const file = pathFor(options);
  const dir = file.replace(/[\\/][^\\/]*$/, "") || ".";
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const renameFile = options.renameFile ?? rename;
  const settings = normalizeSettings(input);
  const tmp = `${file}.tmp-${process.pid}-${now()}-${Math.floor(random() * 1_000_000)}`;

  await mkdir(dir, { recursive: true });
  await writeFile(tmp, `${JSON.stringify(settings, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    await renameFile(tmp, file);
  } catch (error) {
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
  return settings;
}

/** Merge a partial update with the current settings and persist it atomically. */
export async function updateSettings(
  patch: SettingsPatch,
  options: SettingsStoreOptions = {},
): Promise<DeepListenerSettings> {
  const current = await readSettings(options);
  return writeSettings(
    {
      ...current,
      ...patch,
      ui: { ...current.ui, ...patch.ui },
      demo: { ...current.demo, ...patch.demo },
      diagnostics: { ...current.diagnostics, ...patch.diagnostics },
      providerVerification: { ...current.providerVerification, ...patch.providerVerification },
    },
    options,
  );
}

/**
 * Apply persisted non-secret provider routing to the server process. Missing
 * settings intentionally leave legacy `.env`/secrets values untouched; once a
 * settings file exists it becomes the source of truth for these two fields.
 */
export async function loadSettingsIntoEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const loaded = await readSettingsFile();
  // A corrupt/future document is retained for recovery and must not silently
  // override a working legacy `.env`/secrets profile during startup.
  if (!loaded.exists || loaded.source === "recovered") return;
  env.TRANSCRIPTION_PROVIDER = loaded.settings.selectedProvider;
  if (loaded.settings.openaiBaseUrl) env.OPENAI_BASE_URL = loaded.settings.openaiBaseUrl;
  else delete env.OPENAI_BASE_URL;
}
