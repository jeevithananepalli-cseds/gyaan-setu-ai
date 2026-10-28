import { describe, expect, it } from "vitest";
import { offlinePackageSize, offlinePackageSteps } from "../../src/ai/offline-downloader.js";

describe("offline package", () => {
  it("includes the translators for Telugu and Hindi", () => {
    expect(offlinePackageSteps("Telugu")).toEqual(["tutor", "en-indic", "indic-en", "voice"]);
    expect(offlinePackageSteps("Hindi")).toEqual(["tutor", "en-indic", "indic-en", "voice"]);
  });

  it("includes on-device voice input for English", () => {
    expect(offlinePackageSteps("English")).toEqual(["tutor", "voice", "speech"]);
  });

  it("reports the download size", () => {
    expect(offlinePackageSize("English")).toBe(482);
    expect(offlinePackageSize("Telugu")).toBe(976);
  });
});
