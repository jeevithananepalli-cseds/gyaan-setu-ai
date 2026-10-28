import { beforeEach, describe, expect, it } from "vitest";
import { state } from "../../src/core/state.js";
import {
  cleanText,
  detectAssistantIntent,
  expandAssistantTokens,
  getQuestionTokens,
  searchOfflineKnowledge,
  textMatchScore
} from "../../src/features/assistant/offline-search.js";

beforeEach(() => {
  state.selectedLanguage = "English";
});

describe("cleanText", () => {
  it("lowercases, strips punctuation and collapses spaces", () => {
    expect(cleanText("  What's   a PLANT?! ")).toBe("what s a plant");
  });
});

describe("getQuestionTokens", () => {
  it("drops stop words and one-letter words", () => {
    const tokens = getQuestionTokens("What is a plant?");

    expect(tokens).toContain("plant");
    expect(tokens).not.toContain("what");
    expect(tokens).not.toContain("is");
    expect(tokens).not.toContain("a");
  });

  it("keeps Telugu and Hindi words intact", () => {
    expect(getQuestionTokens("మొక్కలు ఆహారం")).toContain("మొక్కలు");
    expect(getQuestionTokens("पौधे भोजन")).toContain("पौधे");
  });
});

describe("textMatchScore", () => {
  it("counts how many tokens appear in the text", () => {
    expect(textMatchScore("Plants need water and sunlight.", ["water", "sunlight", "moon"])).toBe(2);
  });

  it("is zero when nothing matches", () => {
    expect(textMatchScore("Plants need water.", ["rocket"])).toBe(0);
  });
});

describe("expandAssistantTokens", () => {
  it("returns unknown tokens unchanged and without duplicates", () => {
    expect(expandAssistantTokens(["zzzunknown", "zzzunknown"])).toEqual(["zzzunknown"]);
  });
});

describe("detectAssistantIntent", () => {
  it.each([
    ["Why do plants need sunlight?", "why"],
    ["How do fish breathe?", "how"],
    ["What is a habitat?", "what"],
    ["Difference between a plant and an animal", "difference"],
    ["Plants", "general"]
  ])("%s -> %s", (question, intent) => {
    expect(detectAssistantIntent(question)).toBe(intent);
  });
});

describe("searchOfflineKnowledge", () => {
  it("finds the photosynthesis entry when the topic is named", () => {
    const result = searchOfflineKnowledge("What is photosynthesis?");

    expect(result.topic).toBe("photosynthesis");
    expect(result.source).toBe("knowledge");
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("answers in the selected language", () => {
    state.selectedLanguage = "Telugu";
    const result = searchOfflineKnowledge("కిరణజన్య సంయోగక్రియ");

    expect(result.topic).toBe("photosynthesis");
    expect(result.answer).toMatch(/[ఀ-౿]/);
  });

  it("returns null when the question has no usable words", () => {
    expect(searchOfflineKnowledge("what is the")).toBeNull();
  });
});
