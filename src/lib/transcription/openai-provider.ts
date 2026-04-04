import OpenAI from "openai";
import { type TranscriptionSegment as OpenAITranscriptionSegment, type TranscriptionVerbose } from "openai/resources/audio/transcriptions";
import { createReadStream } from "fs";
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

    const verboseResponse = response as TranscriptionVerbose;
    const segments = verboseResponse.segments?.map((segment: OpenAITranscriptionSegment) => ({
      text: segment.text,
      start: segment.start,
      end: segment.end,
    })) || [];

    return {
      fullText: response.text,
      segments,
      rawJson: JSON.stringify(response),
    };
  }
}
