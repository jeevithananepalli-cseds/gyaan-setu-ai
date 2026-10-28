import en from "./locales/en.json";
import hi from "./locales/hi.json";
import te from "./locales/te.json";
import { updateOfflineAiStatus } from "../ai/offline-ai.client.js";
import { state } from "../core/state.js";

// ======================================================
// TRANSLATION HELPERS
// ======================================================

export function textByLanguage(
  english,
  telugu,
  hindi
) {

  if (state.selectedLanguage === "Telugu") {
    return telugu;
  }

  if (state.selectedLanguage === "Hindi") {
    return hindi;
  }

  return english;
}


const locales = { English: en, Telugu: te, Hindi: hi };

// Shell and shared UI strings. An unknown language falls back to English and
// an unknown key is returned as-is.
// Runs fn with a different language selected, then puts the old one back.
// The chat uses this to answer in the language of the question while the
// rest of the app stays in the learner's chosen language. fn must be
// synchronous.
export function withLanguage(language, fn) {
  const previous = state.selectedLanguage;
  state.selectedLanguage = language;

  try {
    return fn();
  }
  finally {
    state.selectedLanguage = previous;
  }
}


export function uiText(key) {
  const text = (locales[state.selectedLanguage] || en)[key];

  return text === undefined
    ? key
    : text;
}


export function applyShellLanguage() {

  const textTargets = {
    brandTagline: "tagline",
    assistantTitle: "assistant",
    assistantSubtitle: "offlineAssistant",
    homeNavLabel: "home",
    learnNavLabel: "learn",
    askNavLabel: "ask",
    chipPlants: "plants",
    chipWater: "water",
    chipAnimals: "animals",
    chipFood: "food",
    chipEnvironment: "environment",
    simpleExplain: "simpleExplain",
    example: "example",
    anotherQuestion: "anotherQuestion"
  };


  Object.keys(textTargets).forEach(
    id => {
      const element = document.getElementById(id);

      if (element) {
        element.textContent = uiText(textTargets[id]);
      }
    }
  );

  // Shell text that appears more than once (sidebar and bottom bar) is
  // marked with data-i18n instead of an id.
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = uiText(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-label]").forEach(element => {
    const label = uiText(element.dataset.i18nLabel);
    element.setAttribute("aria-label", label);
    element.title = label;
  });

  const languageLabel = document.getElementById("currentLanguageLabel");
  if (languageLabel) {
    languageLabel.textContent = getLanguageDisplayName();
  }

  document.documentElement.lang =
    { Telugu: "te", Hindi: "hi" }[state.selectedLanguage] || "en";

  document.getElementById("simpleExplainLabel")?.replaceChildren(
    document.createTextNode(uiText("simpleExplain"))
  );
  document.getElementById("exampleLabel")?.replaceChildren(
    document.createTextNode(uiText("example"))
  );
  document.getElementById("anotherQuestionLabel")?.replaceChildren(
    document.createTextNode(uiText("anotherQuestion"))
  );
  updateOfflineAiStatus();


  document.getElementById("chatFab")?.setAttribute(
    "aria-label",
    uiText("openAssistant")
  );

  document.getElementById("closeChat")?.setAttribute(
    "aria-label",
    uiText("close")
  );

  document.getElementById("chatInput")?.setAttribute(
    "placeholder",
    uiText("askQuestion")
  );
}


export function getClassName(number) {

  return textByLanguage(
    `Class ${number}`,
    `తరగతి ${number}`,
    `कक्षा ${number}`
  );
}


export function getLanguageDisplayName() {

  return state.selectedLanguage === "Telugu"
    ? "తెలుగు"
    : state.selectedLanguage === "Hindi"
      ? "हिन्दी"
      : "English";
}
