// Storage keys, cache names and the model name shared across the app.
// Changing a storage key or the AI cache name orphans what learners already
// have on their devices (saved progress, the downloaded model).

export const ACCOUNTS_KEY = "gyaanAccounts";
export const CURRENT_ACCOUNT_KEY = "gyaanCurrentAccount";
export const OFFLINE_AI_STATE_KEY = "gyaanOfflineAiState";

export const OFFLINE_AI_MODEL = "SmolLM2-360M-Instruct";

// Holds the on-device model and its runtime. Shared with the service worker.
export const AI_CACHE_NAME = "gyaan-setu-ai-v1";
// Holds the bundled Telugu and Hindi voices a learner has used. Filled by
// the voice worker itself, so it works even without the service worker.
export const VOICE_CACHE_NAME = "gyaan-setu-voices-v1";
// Holds the English <-> Telugu/Hindi translation models, filled by the
// translation worker the same way.
export const TRANSLATOR_CACHE_NAME = "gyaan-setu-translator-v1";
// Holds the on-device speech recognition models (voice input offline).
export const SPEECH_CACHE_NAME = "gyaan-setu-speech-v1";

// Cache lookups by URL alone. Some servers send "Vary: Origin" on model
// files, and a stored response with that header was then not found again,
// so models that had been downloaded did not load offline.
export const MATCH_OPTIONS = { ignoreVary: true };

// Where the AI models are downloaded from. In production they are hosted
// apart from the app (see docs/PRODUCTION_DEPLOYMENT.md) and the build sets
// VITE_MODELS_URL, ending with "/". Without it they come from the app's own
// models/ folder (public/models/ during development).
const MODELS_URL = import.meta.env?.VITE_MODELS_URL || "";

export function modelsBaseUrl(appBaseUrl) {
  if (!MODELS_URL) return `${appBaseUrl}models/`;
  return MODELS_URL.endsWith("/") ? MODELS_URL : `${MODELS_URL}/`;
}

// Written to the AI cache once every model file has been stored.
export const AI_READY_MARKER = "./gyaan-ai-v1-ready";
