import { CURRENT_ACCOUNT_KEY } from "../config/constants.js";
import { getItem, readAccounts } from "./storage.js";

// Mutable app state shared by every module. Read it at call time;
// never copy a value out at import time.
export const state = {
  accounts: readAccounts(),
  currentAccountId: getItem(CURRENT_ACCOUNT_KEY) || null,
  selectedLanguage: getItem("gyaanLanguage") || "English",
  selectedClass: null,
  completedLessons: {},
  // Quiz level results by lesson: { "class-chapter-lesson": { level: { best, total, attempts, passed } } }
  quizLevels: {},
  lastLesson: null,
  wrongAnswers: [],
  experiencePoints: 0,
  languageChosenBeforeAuth: false,
  lastAssistantQuestion: "",
  lastAssistantResult: null,
  offlineAiEngine: null,
  offlineAiWorker: null,
  offlineAiLoadPromise: null,
  offlineAiState: "not-started",
  offlineAiProgress: 0,
  offlineAiRequestId: 0,
  // { requestId, language, originalQuestion, conversation } of the question
  // the model is answering, so its English answer can be translated.
  offlineAiRequest: null,
  offlineAiResponseTimer: null,
  // Goes up whenever the chat starts over (new chat language, closed), so
  // answers still arriving for the old conversation are dropped.
  assistantConversation: 0,
  pendingAssistantQuestion: null,
  pendingAssistantTimer: null,
  aiState: "not-started",
  aiReadyPromise: null,
  aiModelTimingActive: false,
  aiFirstResponseTimingActive: false,
  aiBackend: "unknown",
  aiCacheWarmupPromise: null,
  aiWarmupScheduled: false,
  aiCacheRequestId: 0,
  speechRecognition: null,
  isListeningForQuestion: false,
  voiceSessionFinalTranscript: "",
  voiceSessionResults: new Map(),
  voiceSilenceTimer: null,
  voiceRestartTimer: null,
  voiceRestartCount: 0,
  voiceManuallyStopped: false,
  voiceFinalizing: false,
  activeSpeechButton: null,
  speechSynthesisActive: false,
  // Chat: its own language (null = follow the app), and read-aloud settings.
  chatLanguage: null,
  autoSpeak: getItem("gyaanAutoSpeak") === "1",
  voiceQuestionPending: false,
  lastQuestionByVoice: false,
  // The quiz level on screen: { classNumber, chapterIndex, lessonIndex,
  // levelIndex, levelCount, start, selections, submitted }.
  quiz: null
};
