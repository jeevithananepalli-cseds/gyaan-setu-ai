import { describe, expect, it } from "vitest";
import { getLanguageTtsCode } from "../../src/ai/offline-downloader.js";

describe("offline-downloader", () => {
  it("resolves the correct TTS voice code for each language", () => {
    expect(getLanguageTtsCode("en")).toBe("mms-tts-eng");
    expect(getLanguageTtsCode("te")).toBe("mms-tts-tel");
    expect(getLanguageTtsCode("hi")).toBe("mms-tts-hin");
    expect(getLanguageTtsCode("unknown")).toBe("mms-tts-eng");
  });
});
