import OpenAI from "openai";
import { createReadStream } from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

async function main() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  console.log("Proxy found in env:", proxyUrl || "None");

  const httpAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: httpAgent,
    timeout: 120 * 1000,
  });

  // Find a file to test
  const filePath = path.join(process.cwd(), "public/uploads", "34c62b53-799c-4a2b-a542-ab55a2b7b332-test-deep-listener.wav");
  
  console.log("Using file:", filePath);

  try {
    console.log("Starting Whisper transcription...");
    const start = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: "whisper-1",
    });
    const end = Date.now();
    console.log("Success! Time taken:", (end - start) / 1000, "s");
    console.log("Transcription:", transcription.text);
  } catch (error: any) {
    console.error("Error during transcription:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

main();
