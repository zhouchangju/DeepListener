import OpenAI from "openai";
import { createReadStream } from "fs";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { TranscriptionProvider, TranscriptionResponse } from "./types";

export class OpenAIProvider implements TranscriptionProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });
  }

  async transcribe(filePath: string): Promise<TranscriptionResponse> {
    const response = await this.client.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    return {
      fullText: response.text,
      segments: response.segments?.map((s: any) => ({
        text: s.text,
        start: s.start,
        end: s.end,
      })) || [],
      rawJson: JSON.stringify(response),
    };
  }
}
