import { describe, expect, it } from "vitest";
import { trimToSentence } from "../../src/ai/prompts.js";
import {
  fromModelScript,
  needsTranslation,
  splitSentences,
  tidyTranslation,
  toModelScript,
  translationDirection
} from "../../src/ai/translation-text.js";

describe("translationDirection", () => {
  it("uses en-indic from English and indic-en otherwise", () => {
    expect(translationDirection("English", "Telugu")).toBe("en-indic");
    expect(translationDirection("English", "Hindi")).toBe("en-indic");
    expect(translationDirection("Telugu", "English")).toBe("indic-en");
    expect(translationDirection("Hindi", "English")).toBe("indic-en");
  });
});

describe("model script", () => {
  it("maps Telugu letters to the matching Devanagari letters and back", () => {
    expect(toModelScript("నీరు", "Telugu")).toBe("नीरु");
    expect(fromModelScript("नीरु", "Telugu")).toBe("నీరు");
  });

  it("round-trips a whole Telugu sentence unchanged", () => {
    const sentence = "కిరణజన్య సంయోగక్రియ అంటే ఏమిటి?";
    expect(fromModelScript(toModelScript(sentence, "Telugu"), "Telugu")).toBe(sentence);
  });

  it("leaves Hindi, English, digits and the danda alone", () => {
    expect(toModelScript("पानी क्यों महत्वपूर्ण है।", "Hindi")).toBe("पानी क्यों महत्वपूर्ण है।");
    expect(fromModelScript("V = IR, 9.8 m/s²।", "Telugu")).toBe("V = IR, 9.8 m/s²।");
  });
});

describe("splitSentences", () => {
  it("splits lines and sentences but keeps decimals whole", () => {
    expect(splitSentences("g is 9.8 m/s². It pulls things down!\nWhy? Gravity.")).toEqual([
      ["g is 9.8 m/s².", "It pulls things down!"],
      ["Why?", "Gravity."]
    ]);
  });

  it("splits after a danda", () => {
    expect(splitSentences("पानी ज़रूरी है। हम पानी पीते हैं।")).toEqual([["पानी ज़रूरी है।", "हम पानी पीते हैं।"]]);
  });
});

describe("needsTranslation", () => {
  it("skips formulas, numbers and emoji", () => {
    expect(needsTranslation("V = IR")).toBe(false);
    expect(needsTranslation("9.8")).toBe(false);
    expect(needsTranslation("🧠")).toBe(false);
    expect(needsTranslation("Water is important.")).toBe(true);
    expect(needsTranslation("నీరు")).toBe(true);
  });
});

describe("tidyTranslation", () => {
  it("removes the space the model leaves before punctuation", () => {
    expect(tidyTranslation("यह V = IR के रूप में लिखा जाता है ।")).toBe("यह V = IR के रूप में लिखा जाता है।");
    expect(tidyTranslation("ఇది ఏమిటి ?  అది ఇది .")).toBe("ఇది ఏమిటి? అది ఇది.");
  });
});

describe("trimToSentence", () => {
  it("drops a sentence cut off at the token limit", () => {
    expect(trimToSentence("Plants make food. They use sunlight and wat")).toBe("Plants make food.");
  });

  it("drops a sentence the model repeated", () => {
    expect(trimToSentence("Plants make food. They need light.\nPlants make food.")).toBe("Plants make food. They need light.");
  });

  it("keeps complete answers and single unfinished sentences", () => {
    expect(trimToSentence("Plants make food.")).toBe("Plants make food.");
    expect(trimToSentence("Plants make food using")).toBe("Plants make food using");
  });
});
