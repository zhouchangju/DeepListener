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

/** Runtime-only credential/configuration passed to one provider instance. */
export interface TranscriptionProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface TranscriptionProvider {
  transcribe(file: File | string): Promise<TranscriptionResponse>;
}
