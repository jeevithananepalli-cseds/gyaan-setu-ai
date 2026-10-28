// The Ask Gyaan chat window: messages, suggestions, chat language, read-aloud.
import { preloadOfflineAi } from "../../ai/offline-ai.client.js";
import { translationDirection } from "../../ai/translation-text.js";
import { isTranslatorDownloaded, preloadTranslator } from "../../ai/translator.client.js";
import { LANGUAGES, detectLanguage } from "../../config/languages.js";
import { registerActions } from "../../core/actions.js";
import { setActiveNav } from "../../core/router.js";
import { state } from "../../core/state.js";
import { setItem } from "../../core/storage.js";
import { answerAssistantQuestion } from "./assistant.service.js";
import { prepareSpeech, preloadVoiceFor, speakAssistantAnswer, stopSpeaking } from "./speech-output.js";
import { setVoiceInputStatus, stopListening } from "./voice-input.js";
import { textByLanguage, uiText, withLanguage } from "../../i18n/index.js";

const AUTO_SPEAK_KEY = "gyaanAutoSpeak";

export const chatOverlay = document.getElementById("chatOverlay");
export const chatMessages = document.getElementById("chatMessages");
export const chatInput = document.getElementById("chatInput");


// ======================================================
// CHAT LANGUAGE
// ======================================================
// The chat has its own language so a learner can ask in Telugu or Hindi
// without changing the whole app. It starts as the app language.

export function getChatLanguage() {
  return state.chatLanguage || state.selectedLanguage;
}

export function setChatLanguage(language) {
  if (!LANGUAGES.includes(language) || language === getChatLanguage()) return;

  stopListening();
  stopSpeaking();
  state.chatLanguage = language;

  // A new language starts a new conversation: earlier answers are in the old
  // language, and "Explain simply" must not refer back to them. Answers still
  // on their way for the old conversation are dropped.
  state.assistantConversation += 1;
  chatMessages.innerHTML = "";
  chatInput.value = "";
  state.lastAssistantQuestion = "";
  state.lastAssistantResult = null;

  refreshChatLanguage();
  addChatMessage(withLanguage(language, getWelcomeMessage), "bot", { autoSpeak: false });
  preloadVoiceFor(language);
  preloadTranslatorFor(language);
  chatInput.focus();
}

// Loads the English-to-Telugu/Hindi translator into memory when it is already
// on this device, so the first answer is not held up. It is only downloaded
// when a question needs it.
function preloadTranslatorFor(language) {
  if (language === "English") return;
  const direction = translationDirection("English", language);
  isTranslatorDownloaded(direction).then(downloaded => {
    if (downloaded) preloadTranslator(direction).catch(() => {});
  });
}

// Puts every label in the chat window into the chat language.
export function refreshChatLanguage() {
  const language = getChatLanguage();

  withLanguage(language, () => {
    const setText = (id, text) => {
      const element = document.getElementById(id);
      if (element) element.textContent = text;
    };

    setText("assistantTitle", uiText("askGyaan"));
    setText("assistantSubtitle", uiText("offlineAssistant"));
    setText("simpleExplainLabel", uiText("simpleExplain"));
    setText("exampleLabel", uiText("example"));
    setText("anotherQuestionLabel", uiText("anotherQuestion"));
    setText("autoSpeakLabel", textByLanguage("Read aloud", "గట్టిగా చదువు", "बोलकर सुनाएँ"));
    chatInput.setAttribute("placeholder", uiText("askQuestion"));
  });

  document.querySelectorAll("[data-chat-language]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.chatLanguage === language));
  });

  const toggle = document.getElementById("autoSpeakToggle");
  if (toggle) toggle.setAttribute("aria-pressed", String(Boolean(state.autoSpeak)));

  updateChatSuggestions();
  setVoiceInputStatus("idle");
}


// ======================================================
// READ ALOUD
// ======================================================

export function toggleAutoSpeak() {
  state.autoSpeak = !state.autoSpeak;
  setItem(AUTO_SPEAK_KEY, state.autoSpeak ? "1" : "0");

  if (!state.autoSpeak) stopSpeaking();

  document
    .getElementById("autoSpeakToggle")
    ?.setAttribute("aria-pressed", String(state.autoSpeak));
}


// ======================================================
// OPEN / CLOSE
// ======================================================

// The navigation item to highlight again when the chat closes.
let navBeforeChat = "home";

export function focusAssistantInput() {
  chatInput.focus();
}

export function openChat() {
  console.time("CHAT_OPEN");

  if (chatOverlay.classList.contains("hidden")) {
    navBeforeChat = document.querySelector(".nav-item.active")?.dataset.nav || "home";
  }

  chatOverlay.classList.remove("hidden");
  setActiveNav("ask");
  refreshChatLanguage();

  if (chatMessages.children.length === 0) {
    addChatMessage(withLanguage(getChatLanguage(), getWelcomeMessage), "bot", { autoSpeak: false });
  }

  preloadVoiceFor(getChatLanguage());
  preloadTranslatorFor(getChatLanguage());
  preloadOfflineAi();

  setTimeout(() => chatInput.focus(), 150);
  console.timeEnd("CHAT_OPEN");
}

export function closeChat() {
  stopListening();
  stopSpeaking();
  chatOverlay.classList.add("hidden");
  setActiveNav(navBeforeChat);
}

export function resetAssistantConversation() {
  stopListening();
  stopSpeaking();

  state.assistantConversation += 1;
  chatMessages.innerHTML = "";
  state.lastAssistantQuestion = "";
  state.lastAssistantResult = null;
  state.chatLanguage = null;
  chatOverlay.classList.add("hidden");
}


// ======================================================
// CHAT SUGGESTIONS
// ======================================================

const SUGGESTIONS = {
  English: [
    ["🌱", "Plants", "What do plants need to grow?"],
    ["💧", "Water", "Why is water important?"],
    ["🐘", "Animals", "Where do animals live?"],
    ["🍎", "Food", "What is healthy food?"],
    ["🌍", "Environment", "How do we protect the environment?"]
  ],
  Telugu: [
    ["🌱", "మొక్కలు", "మొక్కలు పెరగడానికి ఏమి అవసరం?"],
    ["💧", "నీరు", "నీరు ఎందుకు ముఖ్యమైనది?"],
    ["🐘", "జంతువులు", "జంతువులు ఎక్కడ జీవిస్తాయి?"],
    ["🍎", "ఆహారం", "ఆరోగ్యకరమైన ఆహారం ఏమిటి?"],
    ["🌍", "పర్యావరణం", "పర్యావరణాన్ని ఎలా కాపాడాలి?"]
  ],
  Hindi: [
    ["🌱", "पौधे", "पौधों को बढ़ने के लिए क्या चाहिए?"],
    ["💧", "पानी", "पानी क्यों महत्वपूर्ण है?"],
    ["🐘", "जानवर", "जानवर कहाँ रहते हैं?"],
    ["🍎", "भोजन", "स्वस्थ भोजन क्या है?"],
    ["🌍", "पर्यावरण", "पर्यावरण की रक्षा कैसे करें?"]
  ]
};

export function updateChatSuggestions() {
  const container = document.querySelector(".suggestions");
  if (!container) return;

  const suggestions = SUGGESTIONS[getChatLanguage()] || SUGGESTIONS.English;

  container.innerHTML = suggestions
    .map(([icon, label, question]) =>
      `<button data-action="askSuggestion('${question}')">${icon} ${label}</button>`
    )
    .join("");
}


// ======================================================
// CHAT WELCOME
// ======================================================

export function getWelcomeMessage() {
  return textByLanguage(
    "👋 Hi! I'm Gyaan. Ask me anything by typing or by tapping the mic.",
    "👋 హాయ్! నేను జ్ఞాన్. టైప్ చేసి లేదా మైక్ నొక్కి ఏదైనా అడగండి.",
    "👋 नमस्ते! मैं ज्ञान हूँ। टाइप करके या माइक दबाकर कुछ भी पूछें।"
  );
}


// ======================================================
// SEND CHAT MESSAGE
// ======================================================

// options.suggested  one of the chat's own suggestions, which all have a
// hand-written answer in every language.
export function sendAssistantQuestion(question, action = "", options = {}) {
  console.log("Original question:", question);

  // Voice input sets this just before sending; a spoken question gets a
  // spoken answer even when read-aloud is switched off.
  state.lastQuestionByVoice = Boolean(state.voiceQuestionPending);
  state.voiceQuestionPending = false;

  stopSpeaking();
  addChatMessage(question, "user");
  state.lastAssistantQuestion = question;
  chatInput.value = "";
  answerAssistantQuestion(question, action, options);
}

export function askAssistantAction(action) {
  if (!state.lastAssistantQuestion) {
    focusAssistantInput();
    return;
  }

  answerAssistantQuestion(state.lastAssistantQuestion, action);
}

export function sendMessage() {
  const question = chatInput.value.trim();
  if (!question) return;

  sendAssistantQuestion(question);
}

export function askSuggestion(question) {
  sendAssistantQuestion(question, "", { suggested: true });
}


// ======================================================
// MESSAGES
// ======================================================

// Shown while the on-device model is loading or writing an answer. The next
// bot message replaces it.
export function showThinkingMessage(text) {
  return addChatMessage(text, "bot", { thinking: true });
}

// Changes the text of the current "working on it" message (download
// progress), or shows one if there is none.
export function updateThinkingMessage(text) {
  const current = chatMessages.querySelector(".message.thinking .message-text");
  if (current) current.textContent = text;
  else showThinkingMessage(text);
}

// Shows an answer that is still being written in the "working on it"
// message, in normal text. It is replaced by the finished answer.
export function updateWritingMessage(text) {
  updateThinkingMessage(text);
  chatMessages.querySelector(".message.thinking")?.classList.add("writing");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeThinkingMessages() {
  chatMessages.querySelectorAll(".message.thinking").forEach(message => message.remove());
}

// options.thinking   a temporary "working on it" message, never spoken
// options.autoSpeak  false to keep an answer silent (for example the greeting)
export function addChatMessage(text, sender, options = {}) {
  const isBot = sender !== "user";

  if (isBot) removeThinkingMessages();

  const language = detectLanguage(text, getChatLanguage());

  const message = document.createElement("div");
  message.classList.add("message", isBot ? "bot-message" : "user-message");
  message.dataset.language = language;
  message.lang = { Telugu: "te", Hindi: "hi" }[language] || "en";
  if (options.thinking) message.classList.add("thinking");

  const content = document.createElement("div");
  content.className = "message-content";

  const messageText = document.createElement("span");
  messageText.className = "message-text";
  messageText.textContent = text;
  content.appendChild(messageText);

  let speakButton = null;

  if (isBot && !options.thinking) {
    speakButton = document.createElement("button");
    speakButton.type = "button";
    speakButton.className = "speak-answer-button";
    speakButton.textContent = "🔊";
    speakButton.setAttribute("aria-label", withLanguage(getChatLanguage(), () => textByLanguage(
      "Read answer aloud",
      "సమాధానాన్ని గట్టిగా చదవండి",
      "उत्तर ज़ोर से पढ़ें"
    )));
    speakButton.title = speakButton.getAttribute("aria-label");

    speakButton.addEventListener("click", () => {
      if (speakButton.classList.contains("speaking")) {
        stopSpeaking();
        return;
      }
      speakAssistantAnswer(text, speakButton, language);
    });

    content.appendChild(speakButton);
  }

  message.appendChild(content);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const shouldSpeak =
    speakButton &&
    options.autoSpeak !== false &&
    (state.autoSpeak || state.lastQuestionByVoice);

  if (shouldSpeak) {
    speakAssistantAnswer(text, speakButton, language);
  }
  else if (speakButton && options.autoSpeak !== false) {
    prepareSpeech(text, language);
  }

  return message;
}


registerActions({
  focusAssistantInput,
  askAssistantAction,
  openChat,
  askSuggestion,
  setChatLanguage,
  toggleAutoSpeak
});
