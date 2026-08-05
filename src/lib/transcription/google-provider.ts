import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import { mimeFromExtension } from "@/lib/media-storage";
import { TranscriptionProvider, TranscriptionResponse, TranscriptionSegment, type TranscriptionProviderConfig } from "./types";

export class GoogleProvider implements TranscriptionProvider {
  private genAI: GoogleGenerativeAI;

  constructor(config?: TranscriptionProviderConfig) {
    const apiKey = config?.apiKey ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is not set. Set GOOGLE_API_KEY in your environment.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async transcribe(filePath: string): Promise<TranscriptionResponse> {
    // 切换到 ListModels 中看到的超前版本：2.5
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 读取音频文件并转换为 Base64
    const audioData = fs.readFileSync(filePath);
    const base64Audio = audioData.toString("base64");

    const prompt = `
      Please transcribe this audio accurately.
      Output the result ONLY as a JSON array of objects.
      Each object must have:
      - "text": the transcribed sentence string
      - "start": the start time in SECONDS (float, e.g. 61.5, NOT 1:01.5)
      - "end": the end time in SECONDS (float)

      IMPORTANT:
      1. Timestamps must be absolute seconds from the beginning.
      2. Do NOT use minute format (e.g. 1.30 for 1 min 30s is WRONG, use 90.0).
      3. Ensure no overlapping or huge gaps.

      Return ONLY the JSON array, no other text.
    `;

    // Derive the MIME from the file extension via the shared map so non-mp3/wav
    // uploads (m4a, flac, ogg, ...) are sent with the correct MIME instead of
    // the previously hard-coded audio/wav fallback.
    const mimeType = mimeFromExtension(filePath);

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio,
        },
      },
      prompt,
    ]);

    let responseText: string;
    try {
      responseText = result.response.text();
    } catch (err) {
      // Safety filters / blocked responses throw here.
      throw new Error(`Gemini transcription request failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Robust JSON extraction: strip Markdown fences and, if the model wrapped
    // the array in prose, pull out the first [...] block before parsing.
    const cleaned = responseText.replace(/```json|```/g, "").trim();
    const jsonCandidate = extractJsonArray(cleaned);

    try {
      const segments: TranscriptionSegment[] = JSON.parse(jsonCandidate);
      const fullText = segments.map(s => s.text).join(" ");

      return {
        fullText,
        segments,
        rawJson: cleaned,
      };
    } catch {
      console.error("Gemini transcription response could not be parsed");
      throw new Error("Gemini transcription failed to return valid JSON format.");
    }
  }
}

/**
 * Pull the first `[ ... ]` substring out of `text`, tolerating leading prose
 * (e.g. "Here is the JSON:") and trailing remarks. Returns the input trimmed
 * of fences when no bracket pair is found, so the caller's JSON.parse still
 * surfaces the real parse error.
 */
function extractJsonArray(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}
