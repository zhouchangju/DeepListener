import * as dotenv from "dotenv";
import { ProxyAgent, setGlobalDispatcher } from "undici";

dotenv.config();

interface GoogleModel {
  name: string;
  supportedGenerationMethods?: string[];
}

interface ModelListResponse {
  error?: unknown;
  models?: GoogleModel[];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function main() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxyUrl) {
    console.log("Using proxy:", proxyUrl);
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
  }

  try {
    console.log("Fetching available models...");
    // 只能通过 fetch 直接访问，SDK 没暴露 listModels
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
    const data = await response.json() as ModelListResponse;
    
    if (data.error) {
      console.error("Error from API:", data.error);
      return;
    }

    const models = data.models || [];
    console.log("Available models (first 10):");
    models.slice(0, 10).forEach((m) => {
      console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
    });
    
    const hasFlash = models.some((m) => m.name.includes("gemini-1.5-flash"));
    console.log("\nIs gemini-1.5-flash in the list?", hasFlash ? "✅ Yes" : "❌ No");

  } catch (error: unknown) {
    console.error("Request failed:", getErrorMessage(error));
  }
}

main();
