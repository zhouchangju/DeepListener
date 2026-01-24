import { createClient } from "@deepgram/sdk";
import * as fs from "fs";
import { TranscriptionProvider, TranscriptionResponse } from "./types";

export class DeepgramProvider implements TranscriptionProvider {
  private deepgram;

  constructor() {
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");
  }

  async transcribe(filePath: string): Promise<TranscriptionResponse> {
    const audioBuffer = fs.readFileSync(filePath);

    // Deepgram 强大的智能分句 (smart_format) 和标点 (punctuate)
    const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: "nova-2", // Deepgram 最强的模型
        smart_format: true,
        punctuate: true,
        paragraphs: true, // 这一步至关重要，Deepgram 会帮我们切分段落和句子
        utterances: true, // 获取精确的语句时间轴
      }
    );

    if (error) {
      console.error("Deepgram API Error:", error);
      throw new Error(`Deepgram Error: ${error.message}`);
    }

    // 解析 Utterances（话语/句子）
    // Deepgram 的 utterances 通常对应一个完整的句子或意群，时间轴非常精准
    const segments = result.results?.utterances?.map((u: any) => ({
      text: u.transcript,
      start: u.start,
      end: u.end,
    })) || [];

    const fullText = result.results?.channels[0]?.alternatives[0]?.transcript || "";

    return {
      fullText,
      segments,
      rawJson: JSON.stringify(result),
    };
  }
}
