import { createClient } from "@deepgram/sdk";
import * as fs from "fs";
import { TranscriptionProvider, TranscriptionResponse, TranscriptionSegment, type TranscriptionProviderConfig } from "./types";

export class DeepgramProvider implements TranscriptionProvider {
  private deepgram;

  constructor(config?: TranscriptionProviderConfig) {
    const apiKey = config?.apiKey ?? process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("Deepgram API key is not set. Set DEEPGRAM_API_KEY in your environment.");
    }
    this.deepgram = createClient(apiKey);
  }

  async transcribe(filePath: string): Promise<TranscriptionResponse> {
    const audioBuffer = fs.readFileSync(filePath);

    // 请求 word-level 时间戳
    const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: "nova-2",
        smart_format: true,
        punctuate: true,
        paragraphs: true,
        utterances: true,
      }
    );

    if (error) {
      console.error("Deepgram transcription request failed");
      throw new Error("Transcription provider request failed.");
    }

    const words = result.results?.channels[0]?.alternatives[0]?.words || [];
    const segments: TranscriptionSegment[] = [];

    // Surface an empty transcript as an explicit error so the caller does not
    // create a track with zero sentences (which breaks review/vault flows).
    if (words.length === 0) {
      throw new Error("Transcription returned an empty transcript. The audio may be silent or too short.");
    }

    let currentSentenceWords: string[] = [];
    let currentStartTime = words[0].start;
    
    // 自定义分句逻辑：基于标点符号
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const text = word.punctuated_word || word.word;
      
      currentSentenceWords.push(text);

      // 判断是否是句子结尾
      // 规则：以 . ? ! 结尾，或者已经是最后一个词
      const isEndOfSentence = /[.?!]$/.test(text) || i === words.length - 1;

      if (isEndOfSentence) {
        const sentenceText = currentSentenceWords.join(" ");
        const endTime = word.end;

        // 只有当句子稍微长一点（比如 > 1秒）或者确实是结尾时才切分，避免 "Mr." 这种缩写误判
        // 但 Deepgram 的 punctuated_word 通常处理好了 "Mr."，所以直接信赖标点
        segments.push({
          text: sentenceText,
          start: currentStartTime,
          end: endTime,
        });

        // 重置下一句
        currentSentenceWords = [];
        if (i < words.length - 1) {
          currentStartTime = words[i + 1].start;
        }
      }
    }

    // 如果还有剩余的词（没标点），加进去
    if (currentSentenceWords.length > 0) {
      segments.push({
        text: currentSentenceWords.join(" "),
        start: currentStartTime,
        end: words[words.length - 1].end,
      });
    }

    const fullText = result.results?.channels[0]?.alternatives[0]?.transcript || "";

    return {
      fullText,
      segments, // 使用我们自己切分的高精度句子
      rawJson: JSON.stringify(result),
    };
  }
}
