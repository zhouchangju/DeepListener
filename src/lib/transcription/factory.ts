import { OpenAIProvider } from "./openai-provider";
import { GoogleProvider } from "./google-provider";
import { DeepgramProvider } from "./deepgram-provider";
import { TranscriptionProvider, type TranscriptionProviderConfig } from "./types";
import type { ProviderId } from "@/lib/secrets-store";
import { ProxyAgent, setGlobalDispatcher } from "undici";

export function getTranscriptionProvider(): TranscriptionProvider {
  // 全局代理配置 (针对 Node 18+ 原生 fetch)
  // 注意：Deepgram 通常不需要代理，但如果有 HTTPS_PROXY，undici 也会对其生效
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxyUrl) {
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
  }

  const providerType = process.env.TRANSCRIPTION_PROVIDER || "deepgram";

  return getTranscriptionProviderFor(providerType);
}

/**
 * Construct a provider for an explicit retry choice without changing the
 * process-wide selected provider. The provider constructors still read only
 * their own credential from the server environment.
 */
export function getTranscriptionProviderFor(
  provider: string | ProviderId,
  config?: TranscriptionProviderConfig,
): TranscriptionProvider {
  switch (provider.toLowerCase()) {
    case "openai":
      return new OpenAIProvider(config);
    case "google":
      return new GoogleProvider(config);
    case "deepgram":
      return new DeepgramProvider(config);
    default:
      throw new Error("Unsupported transcription provider");
  }
}
