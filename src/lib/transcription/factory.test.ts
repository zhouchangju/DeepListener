import assert from "node:assert/strict";
import test from "node:test";
import { getTranscriptionProviderFor } from "./factory";

test("explicit provider config wins over every process environment credential", () => {
  const previous = {
    deepgram: process.env.DEEPGRAM_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
  };

  process.env.DEEPGRAM_API_KEY = "env-deepgram";
  process.env.OPENAI_API_KEY = "env-openai";
  process.env.GOOGLE_API_KEY = "env-google";
  process.env.OPENAI_BASE_URL = "https://env.example/v1";

  try {
    const deepgram = getTranscriptionProviderFor("deepgram", { apiKey: "selected-deepgram" }) as unknown as {
      deepgram: { key?: string };
    };
    const openai = getTranscriptionProviderFor("openai", {
      apiKey: "selected-openai",
      baseUrl: "https://selected.example/v1",
    }) as unknown as {
      client: { apiKey?: string; baseURL?: string };
    };
    const google = getTranscriptionProviderFor("google", { apiKey: "selected-google" }) as unknown as {
      genAI: { apiKey?: string };
    };

    assert.equal(deepgram.deepgram.key, "selected-deepgram");
    assert.equal(openai.client.apiKey, "selected-openai");
    assert.equal(openai.client.baseURL, "https://selected.example/v1");
    assert.equal(google.genAI.apiKey, "selected-google");
  } finally {
    restoreEnv("DEEPGRAM_API_KEY", previous.deepgram);
    restoreEnv("OPENAI_API_KEY", previous.openai);
    restoreEnv("GOOGLE_API_KEY", previous.google);
    restoreEnv("OPENAI_BASE_URL", previous.baseUrl);
  }
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
