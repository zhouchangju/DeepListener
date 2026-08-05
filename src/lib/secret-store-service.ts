/**
 * Provider credential service boundary (Desktop T131).
 *
 * The service deliberately exposes no `readCredential` method. Callers can
 * either ask for a redacted state or run one server-side operation with the
 * selected provider's credential. This keeps renderer/status serialization
 * independent from secret values and gives tests a deterministic fake backend.
 */
import type { ProviderId } from "@/lib/secrets-store";

export type SecretState = "missing" | "configured" | "invalid" | "unknown";

export interface SecretBackend {
  read(provider: ProviderId): Promise<string | undefined>;
  write(provider: ProviderId, value: string): Promise<void>;
  remove(provider: ProviderId): Promise<void>;
  /** Optional backend-specific validation/status (e.g. an OS keychain). */
  state?(provider: ProviderId): Promise<SecretState>;
}

export type SecretOperation<T> = (credential: string) => Promise<T> | T;

export interface SecretStoreService {
  /** Browser-safe state; never includes the credential value. */
  status(provider: ProviderId): Promise<SecretState>;
  /** Store/replace a credential and return only its redacted state. */
  save(provider: ProviderId, value: string): Promise<SecretState>;
  /** Remove a credential and return only its redacted state. */
  remove(provider: ProviderId): Promise<SecretState>;
  /** Run one operation with one selected provider credential in scope. */
  withCredential<T>(provider: ProviderId, operation: SecretOperation<T>): Promise<T>;
}

function normalizeCredential(value: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Provider credential must not be empty.");
  }
  if (value.length > 500) {
    throw new Error("Provider credential is too long.");
  }
  return value.trim();
}

function isConfigured(value: string | undefined): SecretState {
  return value?.trim() ? "configured" : "missing";
}

/** Create a service over any reviewed backend (file, keychain, or fake). */
export function createSecretStore(backend: SecretBackend): SecretStoreService {
  return {
    async status(provider) {
      try {
        if (backend.state) return await backend.state(provider);
        return isConfigured(await backend.read(provider));
      } catch {
        return "unknown";
      }
    },

    async save(provider, value) {
      const normalized = normalizeCredential(value);
      await backend.write(provider, normalized);
      return "configured";
    },

    async remove(provider) {
      try {
        await backend.remove(provider);
        return "missing";
      } catch {
        return "unknown";
      }
    },

    async withCredential(provider, operation) {
      const credential = await backend.read(provider);
      if (!credential?.trim()) {
        throw new Error("Provider credential is not configured.");
      }
      // The value exists only as the callback argument. The service never
      // returns it or serializes it as status/diagnostic data.
      return await operation(credential);
    },
  };
}

/**
 * Deterministic in-memory backend for contract tests and local failure
 * injection. It is not a production persistence mechanism.
 */
export class FakeSecretBackend implements SecretBackend {
  private readonly values = new Map<ProviderId, string>();

  constructor(initial: Partial<Record<ProviderId, string>> = {}) {
    for (const [provider, value] of Object.entries(initial) as [ProviderId, string][]) {
      if (value?.trim()) this.values.set(provider, value);
    }
  }

  async read(provider: ProviderId): Promise<string | undefined> {
    return this.values.get(provider);
  }

  async write(provider: ProviderId, value: string): Promise<void> {
    this.values.set(provider, value);
  }

  async remove(provider: ProviderId): Promise<void> {
    this.values.delete(provider);
  }

  /** Test-only inspection that stays on the backend, never on the service. */
  has(provider: ProviderId): boolean {
    return this.values.has(provider);
  }
}

export function createFakeSecretStore(
  initial: Partial<Record<ProviderId, string>> = {},
): { backend: FakeSecretBackend; service: SecretStoreService } {
  const backend = new FakeSecretBackend(initial);
  return { backend, service: createSecretStore(backend) };
}
