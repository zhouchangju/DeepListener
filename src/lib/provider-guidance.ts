export type ProviderGuidanceId = "deepgram" | "openai" | "google";

export interface ProviderGuidance {
  id: ProviderGuidanceId;
  copyKey: ProviderGuidanceId;
  /** The current local default starting point; HG-02 still governs release approval. */
  recommended: boolean;
  consoleUrl: string;
  pricingUrl: string;
}

/**
 * Static, non-secret provider guidance. URLs are official entry points only;
 * pricing, quota, connectivity, and model availability are intentionally not
 * asserted here because they change over time and depend on the account.
 */
export const PROVIDER_GUIDANCE: readonly ProviderGuidance[] = [
  {
    id: "deepgram",
    copyKey: "deepgram",
    recommended: true,
    consoleUrl: "https://console.deepgram.com/",
    pricingUrl: "https://deepgram.com/pricing",
  },
  {
    id: "openai",
    copyKey: "openai",
    recommended: false,
    consoleUrl: "https://platform.openai.com/api-keys",
    pricingUrl: "https://openai.com/api/pricing/",
  },
  {
    id: "google",
    copyKey: "google",
    recommended: false,
    consoleUrl: "https://aistudio.google.com/app/apikey",
    pricingUrl: "https://ai.google.dev/pricing",
  },
] as const;

export function getProviderGuidance(id: ProviderGuidanceId): ProviderGuidance {
  return PROVIDER_GUIDANCE.find((provider) => provider.id === id) ?? PROVIDER_GUIDANCE[0];
}
