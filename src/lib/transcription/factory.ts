import { OpenAIProvider } from "./openai-provider";
import { GoogleProvider } from "./google-provider";
import { DeepgramProvider } from "./deepgram-provider";
import { TranscriptionProvider } from "./types";
import { ProxyAgent, setGlobalDispatcher } from "undici";

export function getTranscriptionProvider(): TranscriptionProvider {
  // 全局代理配置 (针对 Node 18+ 原生 fetch)
  // 注意：Deepgram 通常不需要代理，但如果有 HTTPS_PROXY，undici 也会对其生效
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxyUrl) {
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
  }

  const providerType = process.env.TRANSCRIPTION_PROVIDER || "openai";

  switch (providerType.toLowerCase()) {
    case "openai":
      return new OpenAIProvider();
    case "google":
      return new GoogleProvider();
    case "deepgram":
      return new DeepgramProvider();
    default:
      return new OpenAIProvider();
  }
}
