import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import { ProxyAgent, setGlobalDispatcher } from "undici";

dotenv.config();

async function main() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxyUrl) {
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  
  try {
    console.log("Checking for a working Flash model...");
    // 尝试找回 1.5 系列，它们通常是最稳定的
    const models = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-2.0-flash-lite-preview-02-05",
      "gemini-2.0-flash"
    ];

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // 发送一个极微小的请求来测试配额
        const result = await model.generateContent("hi");
        console.log(`✅ ${modelName}: Available! Response: ${result.response.text().substring(0, 10)}...`);
        // 如果成功了，这就是我们要找的模型
        process.exit(0); 
      } catch (e: any) {
        console.log(`❌ ${modelName}: ${e.message.split('\n')[0]}`);
      }
    }

  } catch (error: any) {
    console.error("Diagnostic failed:", error.message);
  }
}

main();
