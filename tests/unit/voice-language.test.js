import { beforeEach, describe, expect, it } from "vitest";
import { state } from "../../src/core/state.js";
import { getSpeechLanguageCode, getVoiceLanguage, toggleVoiceLanguage } from "../../src/features/assistant/voice-input.js";

beforeEach(() => {
  localStorage.clear();
  state.selectedLanguage = "English";
  state.chatLanguage = null;
  state.isListeningForQuestion = false;
});

describe("speaking language", () => {
  it("listens in the chat language by default", () => {
    state.chatLanguage = "Telugu";
    expect(getVoiceLanguage()).toBe("Telugu");
    expect(getSpeechLanguageCode()).toBe("te-IN");
  });

  it("can switch a Telugu or Hindi chat's microphone to English and back", () => {
    state.chatLanguage = "Hindi";
    toggleVoiceLanguage();
    expect(getVoiceLanguage()).toBe("English");
    expect(getSpeechLanguageCode()).toBe("en-IN");

    toggleVoiceLanguage();
    expect(getVoiceLanguage()).toBe("Hindi");
  });

  it("remembers the choice for each chat language separately", () => {
    state.chatLanguage = "Telugu";
    toggleVoiceLanguage();

    state.chatLanguage = "Hindi";
    expect(getVoiceLanguage()).toBe("Hindi");

    state.chatLanguage = "Telugu";
    expect(getVoiceLanguage()).toBe("English");
  });

  it("always listens in English in an English chat", () => {
    state.chatLanguage = "English";
    toggleVoiceLanguage();
    expect(getVoiceLanguage()).toBe("English");
  });
});
