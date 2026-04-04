import OpenAI from "openai";
import { createReadStream } from "fs";
import * as dotenv from "dotenv";
import path from "path";
import { ProxyAgent } from "undici";

dotenv.config();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function main() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  console.log("Proxy found in env:", proxyUrl || "None");

  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    fetchOptions: dispatcher ? { dispatcher } : undefined,
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
  } catch (error: unknown) {
    console.error("Error during transcription:", getErrorMessage(error));
    if (error && typeof error === "object" && "response" in error) {
      const response = (error as { response?: { data?: unknown } }).response;
      if (response?.data) {
        console.error("Response data:", response.data);
      }
    }
  }
}

main();
