import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load() {
  return (await import("../../src/config/constants.js")).modelsBaseUrl;
}

describe("modelsBaseUrl", () => {
  it("uses the app's own models folder by default", async () => {
    vi.stubEnv("VITE_MODELS_URL", "");
    expect((await load())("https://app.example/")).toBe("https://app.example/models/");
  });

  it("uses the configured models host, always ending with a slash", async () => {
    vi.stubEnv("VITE_MODELS_URL", "https://huggingface.co/team/models/resolve/main");
    expect((await load())("https://app.example/")).toBe("https://huggingface.co/team/models/resolve/main/");
  });
});
