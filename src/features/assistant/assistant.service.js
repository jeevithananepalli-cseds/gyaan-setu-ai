import { prepareOfflineAi, updateOfflineAiStatus } from "../../ai/offline-ai.client.js";
import { askCloudAi, isCloudAiAvailable } from "../../ai/cloud-ai.js";
import { translationDirection } from "../../ai/translation-text.js";
import { preloadTranslator, translateText } from "../../ai/translator.client.js";
import { state } from "../../core/state.js";
import { detectLanguage } from "../../config/languages.js";
import {
  addChatMessage,
  getChatLanguage,
  getWelcomeMessage,
  showThinkingMessage,
  updateThinkingMessage,
  updateWritingMessage
} from "./chat.view.js";
import {
  cleanText,
  detectAssistantIntent,
  hasOfflineKnowledgePhrase,
  searchLessonKnowledge,
  searchOfflineKnowledge,
  searchOfflineQuestions
} from "./offline-search.js";
import { textByLanguage, withLanguage } from "../../i18n/index.js";

// Lesson text given to the model with the question. Only a good match is
// worth giving: the small model tends to repeat whatever it is given, so a
// passage that merely shares a word ("sleep on time" for "why do we need
// sleep?") produced an answer about something else.
const CONTEXT_MIN_SCORE = 8;

export function getLessonContext(question) {
  const concept = searchOfflineKnowledge(question);
  const conceptContext = concept && concept.phraseMatch && isUsefulAssistantContext(concept.answer)
    ? `${concept.topic}: ${concept.answer}`
    : "";

  if (isGeneralFactQuestion(question)) return conceptContext;

  const result = searchLessonKnowledge(question);
  if (result && result.score >= CONTEXT_MIN_SCORE && isUsefulAssistantContext(result.answer)) {
    return `${result.lessonTitle}: ${result.answer}`;
  }

  return conceptContext;
}


export function isGeneralFactQuestion(question) {
  const normalized = cleanText(question);
  return [
    "chemical formula",
    "formula of",
    "symbol of",
    "equation of",
    "newton",
    "law of motion",
    "who discovered",
    "how many",
    "capital of"
  ].some(phrase => normalized.includes(phrase));
}


export function isUsefulAssistantContext(text) {
  const normalized = cleanText(text || "");
  if (normalized.length < 24) return false;
  return ![
    "simple primary school language",
    "simple primary school",
    "primary school language",
    "none of these",
    "all of these"
  ].some(phrase => normalized.includes(phrase));
}


// The language to answer in: always the language chosen in the chat window,
// whatever language the question is typed in.
export function getAnswerLanguage() {
  return getChatLanguage();
}

function thinkingText() {
  return textByLanguage(
    "🤖 Gyaan is thinking...",
    "🤖 జ్ఞాన్ ఆలోచిస్తోంది...",
    "🤖 ज्ञान सोच रहा है..."
  );
}

// Shown while a translation model is downloaded (first use only) or loaded.
export function translatorStatusText(status, language) {
  return withLanguage(language, () => status.phase === "downloading"
    ? textByLanguage(
      `📥 Getting the translator ready (first time only): ${status.percent || 0}%`,
      `📥 అనువాదకాన్ని సిద్ధం చేస్తోంది (మొదటిసారి మాత్రమే): ${status.percent || 0}%`,
      `📥 अनुवादक तैयार हो रहा है (सिर्फ़ पहली बार): ${status.percent || 0}%`
    )
    : thinkingText());
}

function unavailableText() {
  return textByLanguage(
    "🤔 This topic is not available in my offline lessons yet. Try Plants, Water, Animals, Food, Health or Environment.",
    "🤔 ఈ విషయం నా ఆఫ్‌లైన్ పాఠాల్లో లేదు. మొక్కలు, నీరు, జంతువులు, ఆహారం, ఆరోగ్యం లేదా పర్యావరణం గురించి అడగండి.",
    "🤔 यह विषय मेरे ऑफलाइन पाठों में नहीं है। पौधे, पानी, जानवर, भोजन, स्वास्थ्य या पर्यावरण के बारे में पूछें।"
  );
}

function instructionFor(action) {
  return action === "simple"
    ? "Explain simply in one short sentence."
    : action === "example"
      ? "Give one familiar example."
      : "Answer briefly and clearly.";
}

// Answers a question in the chat language:
//   1. a hand-written answer from the lessons or the knowledge base, when one
//      matches well (these exist in all three languages);
//   2. otherwise the on-device model. It works in English, so a Telugu or
//      Hindi question is translated to English first, and the answer is
//      translated into the chat language when it arrives.
export async function answerAssistantQuestion(question, action = "", { suggested = false } = {}) {
  const language = getAnswerLanguage();
  const questionLanguage = detectLanguage(question, language);
  const conversation = state.assistantConversation;

  if (action && state.lastAssistantResult) {
    addChatMessage(
      withLanguage(language, () => formatSmartOfflineAnswer(state.lastAssistantResult, action)),
      "bot"
    );
    return;
  }

  // The model is the better answer for anything a lesson does not answer
  // outright, unless it has already failed on this device. The chat's own
  // suggestions always have a hand-written answer.
  const lightweightAnswer = getSmartOfflineAnswer(question, {
    confident: !suggested && state.aiState !== "error"
  });

  if (isLightweightAssistantAnswer(lightweightAnswer, language)) {
    addChatMessage(lightweightAnswer, "bot");
    return;
  }

  // Start the model loading while the question is translated.
  if (!state.offlineAiEngine) prepareOfflineAi();
  if (language !== "English") preloadTranslator(translationDirection("English", language), { download: true }).catch(() => {});

  let englishQuestion = question;

  if (questionLanguage !== "English") {
    showThinkingMessage(withLanguage(language, thinkingText));
    try {
      englishQuestion = await translateText(question, questionLanguage, "English", status => {
        updateThinkingMessage(translatorStatusText(status, language));
      });
    }
    catch (error) {
      console.warn("Could not translate the question:", error);
      if (conversation === state.assistantConversation) {
        addChatMessage(withLanguage(language, unavailableText), "bot");
      }
      return;
    }
    // The chat moved on (new language, cleared) while translating.
    if (conversation !== state.assistantConversation) return;
  }

  askOfflineAi({ question: englishQuestion, originalQuestion: question, language, action });
}

// How long to wait before giving the best answer from the lessons instead.
// The first load includes downloading 270 MB and can take a few minutes on a
// slow connection or computer; an answer takes 5-50 seconds once loaded.
const LOAD_TIMEOUT_MS = 5 * 60 * 1000;
const ANSWER_TIMEOUT_MS = 2 * 60 * 1000;

// Sends an English question to the on-device model, or queues it until the
// model has loaded. The answer is delivered by offline-ai.client.js.
export function askOfflineAi(request) {
  const { question, originalQuestion, language, action } = request;

  // The model could not start on this device; try cloud AI first (if online),
  // then fall back to the offline knowledge base.
  if (state.aiState === "error" && !state.offlineAiEngine) {
    if (isCloudAiAvailable()) {
      const context = withLanguage("English", () => getLessonContext(question));
      showThinkingMessage(withLanguage(language, thinkingText));
      askCloudAi(question, context)
        .then(answer => {
          if (request.conversation !== state.assistantConversation) return;
          if (language === "English") {
            addChatMessage(`☁️ ${answer}`, "bot");
          } else {
            deliverOfflineAiAnswer(answer, { ...request, translation: null });
          }
        })
        .catch(() => {
          if (request.conversation !== state.assistantConversation) return;
          addChatMessage(withLanguage(language, () => getSmartOfflineAnswer(originalQuestion || question)), "bot");
        });
      return;
    }
    addChatMessage(withLanguage(language, () => getSmartOfflineAnswer(originalQuestion || question)), "bot");
    return;
  }

  if (state.offlineAiEngine) {
    const context = withLanguage("English", () => getLessonContext(question));
    const requestId = ++state.offlineAiRequestId;

    state.offlineAiRequest = { requestId, language, originalQuestion, conversation: state.assistantConversation };
    showThinkingMessage(withLanguage(language, thinkingText));

    state.offlineAiEngine.postMessage({
      type: "answer",
      requestId,
      question,
      context,
      instruction: instructionFor(action)
    });

    if (!state.aiFirstResponseTimingActive) {
      console.time("FIRST_TOKEN");
      state.aiFirstResponseTimingActive = true;
    }

    clearTimeout(state.offlineAiResponseTimer);
    state.offlineAiResponseTimer = setTimeout(() => {
      if (requestId !== state.offlineAiRequestId) return;
      state.offlineAiRequestId += 1;
      if (state.aiFirstResponseTimingActive) {
        console.timeEnd("FIRST_TOKEN");
        state.aiFirstResponseTimingActive = false;
      }
      if (state.offlineAiRequest?.conversation !== state.assistantConversation) return;
      addChatMessage(withLanguage(language, () => getSmartOfflineAnswer(originalQuestion || question)), "bot");
    }, ANSWER_TIMEOUT_MS);

    return;
  }

  state.pendingAssistantQuestion = { ...request, conversation: state.assistantConversation };

  showThinkingMessage(withLanguage(language, () => textByLanguage(
    "🤖 Preparing Gyaan for this question...",
    "🤖 ఈ ప్రశ్న కోసం జ్ఞాన్ సిద్ధమవుతోంది...",
    "🤖 इस प्रश्न के लिए ज्ञान तैयार हो रहा है..."
  )));

  clearTimeout(state.pendingAssistantTimer);
  state.offlineAiState = "preparing";
  updateOfflineAiStatus();

  state.pendingAssistantTimer = setTimeout(() => {
    if (!state.pendingAssistantQuestion) return;
    const pending = state.pendingAssistantQuestion;
    state.pendingAssistantQuestion = null;
    if (pending.conversation !== state.assistantConversation) return;
    addChatMessage(withLanguage(pending.language, () => getSmartOfflineAnswer(pending.originalQuestion || pending.question)), "bot");
  }, LOAD_TIMEOUT_MS);

  prepareOfflineAi();
}

// Sentences of an answer, each with its closing mark. Until the answer is
// `finished` the last piece may still be growing, so it is left out.
export function answerSentences(text, finished) {
  const pieces = String(text).trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  return finished ? pieces : pieces.slice(0, -1);
}

// Translates the answer one sentence at a time, starting with the first
// sentence while the model is still writing the next. The sentences are
// translated in order and shown as each one is ready.
function translateSentencesOf(text, request, finished) {
  const translation = request.translation || (request.translation = {
    english: [],
    done: [],
    chain: Promise.resolve(),
    failed: false
  });
  const conversation = request.conversation;

  for (const sentence of answerSentences(text, finished).slice(translation.english.length)) {
    translation.english.push(sentence);
    translation.chain = translation.chain.then(async () => {
      if (translation.failed) return;
      try {
        const translated = await translateText(sentence, "English", request.language, status => {
          if (!translation.done.length) updateThinkingMessage(translatorStatusText(status, request.language));
        });
        translation.done.push(translated);
        if (conversation === state.assistantConversation && request.requestId === state.offlineAiRequestId) {
          updateWritingMessage(`🧠 ${translation.done.join(" ")}`);
        }
      }
      catch (error) {
        console.warn("Could not translate the answer:", error);
        translation.failed = true;
      }
    });
  }

  return translation;
}

// Shows the model's answer while it is still being written: in English as
// it comes, in Telugu or Hindi a sentence at a time.
export function showPartialOfflineAiAnswer(text, request) {
  if (!request || request.conversation !== state.assistantConversation) return;
  const english = String(text || "").replace(/<\|im_(end|start)\|>/g, "").trim();
  if (!english) return;

  if (request.language === "English") updateWritingMessage(`🧠 ${english}`);
  else translateSentencesOf(english, request, false);
}

// Shows the model's finished English answer in the language the question was
// asked in, translating what has not been translated yet.
export async function deliverOfflineAiAnswer(answer, request) {
  const language = request?.language || "English";
  const conversation = request?.conversation ?? state.assistantConversation;

  if (language === "English") {
    addChatMessage(`🧠 ${answer}`, "bot");
    return;
  }

  // The finished answer can drop a sentence the model repeated; then the
  // sentences translated so far no longer line up with it.
  const final = answerSentences(answer, true);
  const sofar = request.translation?.english || [];
  if (sofar.some((sentence, index) => sentence !== final[index])) request.translation = null;

  if (!request.translation) showThinkingMessage(withLanguage(language, thinkingText));
  const translation = translateSentencesOf(answer, request, true);
  await translation.chain;
  if (conversation !== state.assistantConversation) return;

  if (!translation.failed) {
    addChatMessage(`🧠 ${translation.done.join(" ")}`, "bot");
    return;
  }

  // Better an English answer than none, with a note in the chat language.
  addChatMessage(`${withLanguage(language, () => textByLanguage(
    "",
    "(అనువాదం ఇప్పుడు అందుబాటులో లేదు, ఆంగ్లంలో సమాధానం:)",
    "(अनुवाद अभी उपलब्ध नहीं है, अंग्रेज़ी में उत्तर:)"
  ))}
🧠 ${answer}`, "bot");
}


// ======================================================
// OFFLINE CHAT ANSWER
// ======================================================

// Answers from lessons and the knowledge base, in the question's language.
//
// options.confident  only answer when the match is certain: the question
// names a knowledge-base topic or a lesson title. Used while the on-device
// model can still answer, because a loose match ("why is the Sun hot?"
// finding a passage that mentions the Sun) is a worse answer than the
// model's. Without it, the best match is used, for when the model cannot run.
export function getSmartOfflineAnswer(question, options = {}) {
  return withLanguage(getAnswerLanguage(), () => findSmartOfflineAnswer(question, options));
}

function findSmartOfflineAnswer(question, { confident = false } = {}) {
  const normalized = cleanText(question);
  detectAssistantIntent(question);
  if (["hi", "hello", "hey", "హాయ్", "నమస్తే", "नमस्ते", "हेलो"].includes(normalized)) {
    return getWelcomeMessage();
  }
  const directFact = getDirectOfflineFact(question);
  if (directFact) {
    state.lastAssistantResult = null;
    return directFact;
  }

  const lessonResult = isGeneralFactQuestion(question)
    ? null
    : searchLessonKnowledge(question);
  const knowledgeResult = searchOfflineKnowledge(question);
  const offlineQuestionResult = searchOfflineQuestions(question);
  const strongConceptMatch =
    knowledgeResult &&
    knowledgeResult.score >= 8 &&
    (!confident || knowledgeResult.phraseMatch) &&
    (hasOfflineKnowledgePhrase(question) ||
      !lessonResult ||
      lessonResult.score < 8);
  // Only use local content when the match is genuinely strong.
  // Weak fuzzy matches must fall through to the general offline AI.
  const strongLessonMatch =
    lessonResult &&
    lessonResult.score >= 8 &&
    (!confident || lessonResult.type === "title");
  const strongOfflineQuestionMatch = !confident && offlineQuestionResult && offlineQuestionResult.score >= 8;
  const result = strongConceptMatch
    ? knowledgeResult
    : strongLessonMatch
      ? { ...lessonResult, source: "lesson" }
      : strongOfflineQuestionMatch
        ? offlineQuestionResult
        : null;
  if (!result) {
    state.lastAssistantResult = null;
    return unavailableText();
  }

  function getDirectOfflineFact(question) {
    const normalized = cleanText(question);
    if (
      normalized.includes("oxygen") &&
      (normalized.includes("formula") || normalized.includes("symbol"))
    ) {
      return textByLanguage(
        "📚 Offline Knowledge\nThe chemical formula of oxygen gas is O₂.",
        "📚 ఆఫ్‌లైన్ జ్ఞానం\nఆక్సిజన్ వాయువు రసాయన సూత్రం O₂.",
        "📚 ऑफलाइन ज्ञान\nऑक्सीजन गैस का रासायनिक सूत्र O₂ है।"
      );
    }
    return "";
  }

  state.lastAssistantResult = result;
  return formatSmartOfflineAnswer(result, "");
}


export function isLightweightAssistantAnswer(answer, language = getChatLanguage()) {
  const unavailableMessage = withLanguage(language, unavailableText);
  return Boolean(answer) && answer !== unavailableMessage;
}


export function formatSmartOfflineAnswer(result, action = "") {
  let answer = result.answer;
  if (action === "simple") {
    answer = answer.split(/[.!?।]/)[0] + ".";
  }
  if (action === "example") {
    answer += result.example
      ? ` ${result.example}`
      : textByLanguage(
        " For example, we can learn this from things we see around us.",
        " ఉదాహరణకు, మన చుట్టూ కనిపించే విషయాల ద్వారా దీనిని నేర్చుకోవచ్చు.",
        " उदाहरण के लिए, हम इसे अपने आसपास दिखने वाली चीज़ों से सीख सकते हैं।"
      );
  }
  const prefix = result.source === "lesson"
    ? `📘 ${textByLanguage("Related Lesson", "సంబంధిత పాఠం", "संबंधित पाठ")}: ${result.lessonTitle}\n`
    : result.source === "knowledge"
      ? `📚 ${textByLanguage("Offline Knowledge", "ఆఫ్‌లైన్ జ్ఞానం", "ऑफलाइन ज्ञान")}\n`
      : "";
  return `${prefix}${answer}`;
}


export function getOfflineAnswer(
  question
) {
  return getSmartOfflineAnswer(question);
}
