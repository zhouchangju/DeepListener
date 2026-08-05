import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFakeSecretStore,
  createSecretStore,
  FakeSecretBackend,
  type SecretBackend,
} from "./secret-store-service";

test("fake backend reports only configured/missing state", async () => {
  const { service } = createFakeSecretStore({ openai: "sk-test" });

  assert.equal(await service.status("openai"), "configured");
  assert.equal(await service.status("deepgram"), "missing");
  assert.equal(JSON.stringify(await service.status("openai")).includes("sk-test"), false);
});

test("save and remove return redacted state without exposing the credential", async () => {
  const { backend, service } = createFakeSecretStore();

  const saved = await service.save("google", "  google-secret  ");
  assert.equal(saved, "configured");
  assert.equal(backend.has("google"), true);

  const removed = await service.remove("google");
  assert.equal(removed, "missing");
  assert.equal(backend.has("google"), false);
  assert.equal(JSON.stringify({ saved, removed }).includes("google-secret"), false);
});

test("withCredential scopes exactly one selected credential to the operation", async () => {
  const { service } = createFakeSecretStore({
    deepgram: "deepgram-secret",
    openai: "openai-secret",
  });
  let received = "";

  const result = await service.withCredential("openai", async (credential) => {
    received = credential;
    return "provider-result";
  });

  assert.equal(result, "provider-result");
  assert.equal(received, "openai-secret");
  assert.notEqual(received, "deepgram-secret");
});

test("missing credential fails operation without invoking the callback", async () => {
  const { service } = createFakeSecretStore();
  let invoked = false;

  await assert.rejects(
    service.withCredential("deepgram", () => {
      invoked = true;
      return "should-not-run";
    }),
    /not configured/i,
  );
  assert.equal(invoked, false);
});

test("invalid saves are rejected and backend errors become unknown state", async () => {
  const { service } = createFakeSecretStore();
  await assert.rejects(service.save("openai", "   "), /must not be empty/i);
  await assert.rejects(service.save("openai", "x".repeat(501)), /too long/i);

  const failingBackend: SecretBackend = {
    read: async () => { throw new Error("backend unavailable"); },
    write: async () => { throw new Error("backend unavailable"); },
    remove: async () => { throw new Error("backend unavailable"); },
  };
  const failingService = createSecretStore(failingBackend);
  assert.equal(await failingService.status("google"), "unknown");
  assert.equal(await failingService.remove("google"), "unknown");
});

test("backend-specific invalid state is preserved without reading its value", async () => {
  const backend = new FakeSecretBackend({ deepgram: "secret" });
  const invalidBackend: SecretBackend = {
    read: backend.read.bind(backend),
    write: backend.write.bind(backend),
    remove: backend.remove.bind(backend),
    state: async () => "invalid",
  };
  const service = createSecretStore(invalidBackend);
  assert.equal(await service.status("deepgram"), "invalid");
});

test("service surface has no credential read-back method", () => {
  const { service } = createFakeSecretStore({ openai: "secret" });
  assert.equal("read" in service, false);
  assert.equal("readCredential" in service, false);
  assert.equal("getCredential" in service, false);
});
