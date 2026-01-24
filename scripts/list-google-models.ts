import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import { ProxyAgent, setGlobalDispatcher } from "undici";

dotenv.config();

async function main() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxyUrl) {
    console.log("Using proxy:", proxyUrl);
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  
  try {
    console.log("Fetching available models...");
    // 只能通过 fetch 直接访问，SDK 没暴露 listModels
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
    const data = await response.json();
    
    if (data.error) {
      console.error("Error from API:", data.error);
      return;
    }

    console.log("Available models (first 10):");
    data.models.slice(0, 10).forEach((m: any) => {
      console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
    });
    
    const hasFlash = data.models.some((m: any) => m.name.includes("gemini-1.5-flash"));
    console.log("\nIs gemini-1.5-flash in the list?", hasFlash ? "✅ Yes" : "❌ No");

  } catch (error: any) {
    console.error("Request failed:", error.message);
  }
}

main();
