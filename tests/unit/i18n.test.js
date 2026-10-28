import { beforeEach, describe, expect, it } from "vitest";
import { state } from "../../src/core/state.js";
import { textByLanguage, uiText } from "../../src/i18n/index.js";
import en from "../../src/i18n/locales/en.json";
import hi from "../../src/i18n/locales/hi.json";
import te from "../../src/i18n/locales/te.json";

beforeEach(() => {
  state.selectedLanguage = "English";
});

describe("uiText", () => {
  it("returns the string for the selected language", () => {
    expect(uiText("online")).toBe("Online");

    state.selectedLanguage = "Telugu";
    expect(uiText("online")).toBe(te.online);

    state.selectedLanguage = "Hindi";
    expect(uiText("online")).toBe(hi.online);
  });

  it("falls back to English for an unknown language", () => {
    state.selectedLanguage = "Klingon";

    expect(uiText("online")).toBe("Online");
  });

  it("returns the key itself when there is no translation", () => {
    expect(uiText("noSuchKey")).toBe("noSuchKey");
  });
});

describe("textByLanguage", () => {
  it("picks the argument for the selected language", () => {
    expect(textByLanguage("one", "ఒకటి", "एक")).toBe("one");

    state.selectedLanguage = "Telugu";
    expect(textByLanguage("one", "ఒకటి", "एक")).toBe("ఒకటి");

    state.selectedLanguage = "Hindi";
    expect(textByLanguage("one", "ఒకటి", "एक")).toBe("एक");
  });
});

describe("locale files", () => {
  it("define exactly the same keys", () => {
    const keys = Object.keys(en).sort();

    expect(Object.keys(te).sort()).toEqual(keys);
    expect(Object.keys(hi).sort()).toEqual(keys);
  });

  it("have no empty strings", () => {
    for (const locale of [en, te, hi]) {
      for (const [key, value] of Object.entries(locale)) {
        expect(value.trim().length, key).toBeGreaterThan(0);
      }
    }
  });
});
