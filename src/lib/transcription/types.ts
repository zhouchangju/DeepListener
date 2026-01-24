export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionResponse {
  fullText: string;
  segments: TranscriptionSegment[];
  rawJson: string; // 保存原始 JSON 以备后用
}

export interface TranscriptionProvider {
  transcribe(file: File | string): Promise<TranscriptionResponse>;
}
