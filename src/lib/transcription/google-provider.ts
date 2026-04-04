import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import { TranscriptionProvider, TranscriptionResponse, TranscriptionSegment } from "./types";

export class GoogleProvider implements TranscriptionProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
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

    // 根据后缀识别 MIME 类型
    const ext = filePath.split(".").pop()?.toLowerCase();
    const mimeType = ext === "mp3" ? "audio/mp3" : "audio/wav";

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio,
        },
      },
      prompt,
    ]);

    const responseText = result.response.text();
    
    // 清洗可能存在的 Markdown 代码块标记
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    
    try {
      const segments: TranscriptionSegment[] = JSON.parse(cleanJson);
      const fullText = segments.map(s => s.text).join(" ");

      return {
        fullText,
        segments,
        rawJson: cleanJson,
      };
    } catch {
      console.error("Failed to parse Gemini response as JSON:", responseText);
      throw new Error("Gemini transcription failed to return valid JSON format.");
    }
  }
}
