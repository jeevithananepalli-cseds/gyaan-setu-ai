import { describe, expect, it } from "vitest";
import { answerSentences } from "../../src/features/assistant/assistant.service.js";

describe("answerSentences", () => {
  it("leaves out the sentence still being written", () => {
    expect(answerSentences("Light bends in water. Each drop spl", false)).toEqual(["Light bends in water."]);
    expect(answerSentences("Light bends in water.", false)).toEqual([]);
  });

  it("keeps every sentence of a finished answer", () => {
    expect(answerSentences("Light bends in water. Each drop splits it!", true))
      .toEqual(["Light bends in water.", "Each drop splits it!"]);
  });

  it("does not split numbers", () => {
    const text = "A cell gives 1.5 volts. Two give 3 volts.";
    expect(answerSentences(text, true)).toEqual(["A cell gives 1.5 volts.", "Two give 3 volts."]);
    expect(answerSentences(`${text} More`, false)).toEqual(answerSentences(text, true));
  });
});
