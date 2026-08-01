import OpenAI from "openai";
import { type TranscriptionSegment as OpenAITranscriptionSegment, type TranscriptionVerbose } from "openai/resources/audio/transcriptions";
import { createReadStream } from "fs";
import { TranscriptionProvider, TranscriptionResponse } from "./types";

export class OpenAIProvider implements TranscriptionProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Throw a clear error whose message matches the upload-error classifier
      // so a missing key surfaces as an actionable 502 instead of a generic
      // 500 "Media import failed".
      throw new Error("OpenAI API key is not set. Set OPENAI_API_KEY in your environment.");
    }
    this.client = new OpenAI({
      apiKey,
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

    // Short clips can return zero segments with only a `text` value. Creating
    // a track with no sentences leaves the review/vault flows with nothing to
    // operate on, so surface this as an explicit, classified error instead of
    // a silently "successful" empty transcript.
    if (segments.length === 0) {
      throw new Error("Transcription returned an empty transcript. The audio may be silent or too short.");
    }

    return {
      fullText: response.text,
      segments,
      rawJson: JSON.stringify(response),
    };
  }
}
