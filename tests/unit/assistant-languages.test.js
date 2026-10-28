import { beforeEach, describe, expect, it } from "vitest";
import { detectLanguage } from "../../src/config/languages.js";
import { state } from "../../src/core/state.js";
import { getSmartOfflineAnswer } from "../../src/features/assistant/assistant.service.js";
import { looseWordMatch } from "../../src/features/assistant/offline-search.js";
import {
  chooseSpeechEngine,
  cleanTextForSpeech,
  pickVoice,
  usableVoices,
  splitIntoSpeechChunks
} from "../../src/features/assistant/speech-output.js";

const TELUGU = /[ఀ-౿]/;
const DEVANAGARI = /[ऀ-ॿ]/;
const NOT_FOUND = "🤔";

beforeEach(() => {
  state.selectedLanguage = "English";
  state.chatLanguage = null;
  state.selectedClass = null;
});

describe("detectLanguage", () => {
  it("recognises each script", () => {
    expect(detectLanguage("What is water?")).toBe("English");
    expect(detectLanguage("నీరు ఎందుకు ముఖ్యమైనది?")).toBe("Telugu");
    expect(detectLanguage("पानी क्यों महत्वपूर्ण है?")).toBe("Hindi");
  });

  it("lets an Indian script outrank a borrowed English word", () => {
    expect(detectLanguage("photosynthesis అంటే ఏమిటి?")).toBe("Telugu");
    expect(detectLanguage("photosynthesis क्या है?")).toBe("Hindi");
  });

  it("keeps the fallback when the text has no letters", () => {
    expect(detectLanguage("2 + 2 = ?", "Hindi")).toBe("Hindi");
    expect(detectLanguage("", "Telugu")).toBe("Telugu");
  });
});

describe("answers are in the chat language, whatever the question is typed in", () => {
  it("answers an English question in Telugu when the chat is in Telugu", () => {
    state.chatLanguage = "Telugu";
    const answer = getSmartOfflineAnswer("Why is water important?");

    expect(answer).toMatch(TELUGU);
    expect(answer).not.toContain(NOT_FOUND);
    expect(state.selectedLanguage).toBe("English");
  });

  it("answers a Hindi question in Telugu when the chat is in Telugu", () => {
    state.chatLanguage = "Telugu";
    const answer = getSmartOfflineAnswer("पानी क्यों महत्वपूर्ण है?");

    expect(answer).toMatch(TELUGU);
    expect(answer).not.toMatch(DEVANAGARI);
  });

  it("answers a Telugu question in Hindi when the chat is in Hindi", () => {
    state.chatLanguage = "Hindi";
    const answer = getSmartOfflineAnswer("నీరు ఎందుకు ముఖ్యమైనది?");

    expect(answer).toMatch(DEVANAGARI);
    expect(answer).not.toMatch(TELUGU);
  });

  it("answers a Telugu question in English when the chat is in English", () => {
    state.chatLanguage = "English";
    const answer = getSmartOfflineAnswer("నీరు ఎందుకు ముఖ్యమైనది?");

    expect(answer).toContain("Water");
    expect(answer).not.toMatch(TELUGU);
  });
});

describe("every suggested question has an offline answer", () => {
  it.each([
    "What do plants need to grow?",
    "Why is water important?",
    "Where do animals live?",
    "What is healthy food?",
    "How do we protect the environment?",
    "మొక్కలు పెరగడానికి ఏమి అవసరం?",
    "నీరు ఎందుకు ముఖ్యమైనది?",
    "జంతువులు ఎక్కడ జీవిస్తాయి?",
    "ఆరోగ్యకరమైన ఆహారం ఏమిటి?",
    "పర్యావరణాన్ని ఎలా కాపాడాలి?",
    "पौधों को बढ़ने के लिए क्या चाहिए?",
    "पानी क्यों महत्वपूर्ण है?",
    "जानवर कहाँ रहते हैं?",
    "स्वस्थ भोजन क्या है?",
    "पर्यावरण की रक्षा कैसे करें?"
  ])("%s", question => {
    expect(getSmartOfflineAnswer(question)).not.toContain(NOT_FOUND);
  });
});

describe("lesson search", () => {
  it.each([
    ["What is friction?", "English", "Friction"],
    ["ఘర్షణ అంటే ఏమిటి?", "Telugu", "ఘర్షణ"],
    ["घर्षण क्या है?", "Hindi", "घर्षण"],
    // Matched in the question's language, answered in the chat language.
    ["What is friction?", "Telugu", "ఘర్షణ"],
    ["ఘర్షణ అంటే ఏమిటి?", "Hindi", "घर्षण"]
  ])("finds a lesson by its topic: %s (chat in %s)", (question, chatLanguage, word) => {
    state.chatLanguage = chatLanguage;
    const answer = getSmartOfflineAnswer(question);

    expect(answer).not.toContain(NOT_FOUND);
    expect(answer).toContain(word);
  });

  it("does not match parts of words (\"we\" is not \"weather\")", () => {
    expect(getSmartOfflineAnswer("why do we need sleep", { confident: true })).toContain(NOT_FOUND);
  });

  it("leaves loose matches to the AI model when it can answer", () => {
    state.chatLanguage = "Telugu";
    expect(getSmartOfflineAnswer("సూర్యుడు ఎందుకు వేడిగా ఉంటాడు?", { confident: true })).toContain(NOT_FOUND);
  });

  it("answers a lesson title with its hand-written text in the chat language", () => {
    state.chatLanguage = "Telugu";
    const answer = getSmartOfflineAnswer("ohms law", { confident: true });

    expect(answer).toMatch(TELUGU);
    expect(answer).toContain("V = IR");
  });

  it("looks beyond the learner's own class", () => {
    state.selectedClass = 1;

    expect(getSmartOfflineAnswer("What is friction?")).not.toContain(NOT_FOUND);
  });
});

describe("looseWordMatch", () => {
  it("matches Telugu and Hindi words that differ only in their ending", () => {
    expect(looseWordMatch("పర్యావరణం", "పర్యావరణాన్ని")).toBe(true);
    expect(looseWordMatch("पौधे", "पौधों")).toBe(true);
  });

  it("does not match unrelated words or loosen English", () => {
    expect(looseWordMatch("నీరు", "జంతువు")).toBe(false);
    expect(looseWordMatch("plant", "planet")).toBe(false);
  });
});

describe("usableVoices", () => {
  const voices = [
    { name: "Microsoft Zira", lang: "en-US", localService: true },
    { name: "Microsoft Aria Online (Natural)", lang: "en-US", localService: false },
    { name: "Google తెలుగు", lang: "te-IN", localService: false }
  ];

  it("uses every voice online and only on-device voices offline", () => {
    expect(usableVoices(voices, true)).toHaveLength(3);
    expect(usableVoices(voices, false).map(voice => voice.name)).toEqual(["Microsoft Zira"]);
  });

  it("offline, a language with only online voices falls back to the bundled voice", () => {
    const offline = usableVoices(voices, false);
    expect(pickVoice(offline, "te-IN")).toBeNull();
    expect(chooseSpeechEngine({ language: "Telugu", deviceVoice: null, deviceVoiceCount: -1, bundledAvailable: true }))
      .toBe("bundled");
  });
});

describe("choosing how to speak", () => {
  const voice = { lang: "te-IN" };

  it("prefers a voice installed on the device", () => {
    expect(chooseSpeechEngine({ language: "Telugu", deviceVoice: voice, deviceVoiceCount: 5, bundledAvailable: true }))
      .toBe("device");
  });

  it("uses the bundled voice when the device has none for the language", () => {
    expect(chooseSpeechEngine({ language: "Telugu", deviceVoice: null, deviceVoiceCount: 3, bundledAvailable: true }))
      .toBe("bundled");
    expect(chooseSpeechEngine({ language: "Hindi", deviceVoice: null, deviceVoiceCount: 0, bundledAvailable: true }))
      .toBe("bundled");
  });

  it("still tries when the device has not listed its voices", () => {
    expect(chooseSpeechEngine({ language: "English", deviceVoice: null, deviceVoiceCount: 0, bundledAvailable: false }))
      .toBe("attempt");
    expect(chooseSpeechEngine({ language: "Hindi", deviceVoice: null, deviceVoiceCount: 0, bundledAvailable: false }))
      .toBe("attempt");
  });

  it("reports that nothing can speak the language otherwise", () => {
    expect(chooseSpeechEngine({ language: "Telugu", deviceVoice: null, deviceVoiceCount: 3, bundledAvailable: false }))
      .toBe("none");
  });
});

describe("read-aloud text", () => {
  it("drops emoji and turns line breaks into pauses", () => {
    expect(cleanTextForSpeech("📚 Offline Knowledge\nPlants are living things. 🌱"))
      .toBe("Offline Knowledge. Plants are living things.");
  });

  it("splits long answers into short chunks at sentence ends", () => {
    const chunks = splitIntoSpeechChunks("One. Two! Three? चार। " + "x".repeat(30) + ".", 12);

    expect(chunks).toEqual(["One. Two!", "Three? चार।", "x".repeat(30) + "."]);
  });

  it("picks a voice for the exact language, then the same language elsewhere", () => {
    const voices = [{ lang: "en-US" }, { lang: "hi_IN" }, { lang: "te" }];

    expect(pickVoice(voices, "hi-IN")).toBe(voices[1]);
    expect(pickVoice(voices, "te-IN")).toBe(voices[2]);
    expect(pickVoice(voices, "en-IN")).toBe(voices[0]);
    expect(pickVoice([{ lang: "en-US" }], "te-IN")).toBeNull();
  });
});

describe("bundled voice chunking", () => {
  it("cuts a long first sentence at its first comma", async () => {
    const { splitFirstChunk } = await import("../../src/features/assistant/speech-output.js");

    expect(splitFirstChunk(["మనుషులు, జంతువులు మరియు మొక్కలకు నీరు అవసరం.", "రెండవది."]))
      .toEqual(["మనుషులు,", "జంతువులు మరియు మొక్కలకు నీరు అవసరం.", "రెండవది."]);
  });

  it("leaves short first sentences and comma-free ones alone", async () => {
    const { splitFirstChunk } = await import("../../src/features/assistant/speech-output.js");

    expect(splitFirstChunk(["A short one.", "Next."])).toEqual(["A short one.", "Next."]);
    expect(splitFirstChunk(["x".repeat(50) + "."])).toEqual(["x".repeat(50) + "."]);
  });
});
