import { AI_READY_MARKER, MATCH_OPTIONS, OFFLINE_AI_MODEL, OFFLINE_AI_STATE_KEY, modelsBaseUrl } from "../config/constants.js";
import { state } from "../core/state.js";
import { setItem } from "../core/storage.js";
import {
  askOfflineAi,
  deliverOfflineAiAnswer,
  getSmartOfflineAnswer,
  isUsefulAssistantContext,
  showPartialOfflineAiAnswer
} from "../features/assistant/assistant.service.js";
import { addChatMessage, updateThinkingMessage } from "../features/assistant/chat.view.js";
import { getOfflineAiDisplayState } from "../features/progress/profile.view.js";
import { textByLanguage, withLanguage } from "../i18n/index.js";

// When the model cannot answer: the best hand-written answer for the
// question (or "not available"), in the language it was asked in.
function answerWithoutModel(request) {
  if (!request || request.conversation !== state.assistantConversation) return;
  addChatMessage(
    withLanguage(request.language, () => getSmartOfflineAnswer(request.originalQuestion || state.lastAssistantQuestion)),
    "bot"
  );
}

// ======================================================
// CHAT
// ======================================================

export function updateOfflineAiStatus() {
  const card = document.getElementById("offlineAiStatusCard");

  if (card) {
    card.className = `offline-ai-status-card ${state.offlineAiState}`;
    card.innerHTML = `
      <span class="offline-ai-status-icon">${state.offlineAiState === "ready" ? "✅" : "🧠"}</span>
      <span>${getOfflineAiDisplayState()}</span>
    `;
  }
}


export function showOfflineAiPack(forceOpen = false) {
  const panel = document.getElementById("aiPackPanel");
  if (!panel) return;
  panel.classList.toggle("hidden", !forceOpen && !panel.classList.contains("hidden"));
  if (!panel.classList.contains("hidden")) {
    panel.innerHTML = `<div class="ai-pack-status">${getOfflineAiDisplayState()}</div>`;
  }
}


export function updateOfflineAiProgress(message) {
  if (message.state) state.offlineAiState = message.state;
  if (typeof message.progress === "number") state.offlineAiProgress = message.progress;
  updateOfflineAiStatus();

  // A question is waiting for the model: show how far the download is.
  const pending = state.pendingAssistantQuestion;
  if (pending && typeof message.progress === "number" && message.progress < 100) {
    updateThinkingMessage(withLanguage(pending.language, () => textByLanguage(
      `🤖 Preparing Gyaan (first time only): ${message.progress}%`,
      `🤖 జ్ఞాన్ సిద్ధమవుతోంది (మొదటిసారి మాత్రమే): ${message.progress}%`,
      `🤖 ज्ञान तैयार हो रहा है (सिर्फ़ पहली बार): ${message.progress}%`
    )));
  }
}


export function prepareOfflineAi() {
  if (state.offlineAiEngine || state.aiState === "ready") return Promise.resolve(true);
  if (state.aiReadyPromise) return state.aiReadyPromise;
  if (state.aiState === "error") return Promise.resolve(false);
  state.aiState = "loading";
  state.offlineAiState = "preparing";
  updateOfflineAiStatus();
  console.time("MODEL_INIT");
  state.aiModelTimingActive = true;
  state.aiReadyPromise = (async () => {
    return new Promise(resolve => {
    state.offlineAiWorker = new Worker(new URL("./offline-ai.worker.js", import.meta.url), { type: "module" });
    state.offlineAiWorker.onmessage = event => {
      const message = event.data || {};
      if (message.type === "status") {
        updateOfflineAiProgress(message);
        return;
      }
      if (message.type === "ready") {
        state.offlineAiEngine = state.offlineAiWorker;
        state.aiState = "ready";
        state.aiBackend = message.backend || "wasm";
        state.offlineAiState = state.aiBackend === "webgpu" ? "ready" : "lite";
        setItem(OFFLINE_AI_STATE_KEY, state.offlineAiState);
        if (state.aiModelTimingActive) {
          console.timeEnd("MODEL_INIT");
          state.aiModelTimingActive = false;
        }
        updateOfflineAiStatus();
        resolve(true);
        if (state.pendingAssistantQuestion) {
          const pending = state.pendingAssistantQuestion;
          state.pendingAssistantQuestion = null;
          clearTimeout(state.pendingAssistantTimer);
          if (pending.conversation === state.assistantConversation) askOfflineAi(pending);
        }
        return;
      }
      if (message.type === "partial") {
        if (message.requestId === state.offlineAiRequestId) showPartialOfflineAiAnswer(message.text, state.offlineAiRequest);
        return;
      }
      if (message.type === "answer") {
        if (message.requestId !== state.offlineAiRequestId) return;
        clearTimeout(state.offlineAiResponseTimer);
        if (state.aiFirstResponseTimingActive) {
          console.timeEnd("FIRST_TOKEN");
          state.aiFirstResponseTimingActive = false;
        }
        if (isUsefulAssistantContext(message.answer)) {
          deliverOfflineAiAnswer(message.answer, state.offlineAiRequest);
        }
        else {
          answerWithoutModel(state.offlineAiRequest);
        }
        return;
      }
      if (message.type === "answer-error") {
        if (message.requestId !== state.offlineAiRequestId) return;
        clearTimeout(state.offlineAiResponseTimer);
        if (state.aiFirstResponseTimingActive) {
          console.timeEnd("FIRST_TOKEN");
          state.aiFirstResponseTimingActive = false;
        }
        answerWithoutModel(state.offlineAiRequest);
        return;
      }
      if (message.type === "error") {
        console.error("Bundled Offline AI error:", message.error);
        state.aiState = "error";
        state.offlineAiState = "fallback";
        if (state.aiModelTimingActive) {
          console.timeEnd("MODEL_INIT");
          state.aiModelTimingActive = false;
        }
        state.offlineAiWorker.terminate();
        state.offlineAiWorker = null;
        updateOfflineAiStatus();
        if (state.pendingAssistantQuestion) {
          const pending = state.pendingAssistantQuestion;
          state.pendingAssistantQuestion = null;
          clearTimeout(state.pendingAssistantTimer);
          answerWithoutModel(pending);
        }
        resolve(false);
      }
    };
    state.offlineAiWorker.onerror = error => {
      console.error("Bundled Offline AI worker error:", error);
      state.aiState = "error";
      state.offlineAiState = "fallback";
      if (state.aiModelTimingActive) {
        console.timeEnd("MODEL_INIT");
        state.aiModelTimingActive = false;
      }
      state.offlineAiWorker = null;
      updateOfflineAiStatus();
      if (state.pendingAssistantQuestion) {
        const pending = state.pendingAssistantQuestion;
        state.pendingAssistantQuestion = null;
        clearTimeout(state.pendingAssistantTimer);
        answerWithoutModel(pending);
      }
      resolve(false);
    };
    state.offlineAiWorker.postMessage({ type: "init", baseUrl: new URL("./", document.baseURI).href });
    });
  })();
  state.offlineAiLoadPromise = state.aiReadyPromise;
  return state.aiReadyPromise;
}


// Loads the model in the background when the chat opens, so it is ready by
// the time the first question is typed. Only when the model is already on
// this device: it is never downloaded without a question that needs it.
export async function preloadOfflineAi() {
  if (state.offlineAiEngine || state.aiReadyPromise || state.aiState === "error") return;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return;
  try {
    // Only when all the model's parts are stored: the background download
    // (AI_READY_MARKER) saves the runtime but not the model itself.
    const parts = ["aa", "ab", "ac"].map(suffix =>
      `${modelsBaseUrl(new URL("./", document.baseURI).href)}${OFFLINE_AI_MODEL}/onnx/model_q4f16.onnx.part-${suffix}`);
    const stored = (await Promise.all(parts.map(part => caches.match(part, MATCH_OPTIONS)))).every(Boolean);
    if (stored) prepareOfflineAi();
  }
  catch {
    // No cache storage: the model loads when a question needs it.
  }
}


export function requestAiAssetCache() {
  if (state.aiCacheWarmupPromise) return state.aiCacheWarmupPromise;
  state.aiCacheWarmupPromise = new Promise(resolve => {
    if (!("serviceWorker" in navigator) || !navigator.onLine) {
      resolve(false);
      return;
    }

    navigator.serviceWorker.ready.then(async registration => {
      const marker = await caches.match(AI_READY_MARKER);
      if (marker) {
        resolve(true);
        return;
      }

      const requestId = `ai-cache-${++state.aiCacheRequestId}`;
      const onMessage = event => {
        if (event.data?.requestId !== requestId) return;
        navigator.serviceWorker.removeEventListener("message", onMessage);
        resolve(event.data.type === "AI_CACHE_READY");
      };
      navigator.serviceWorker.addEventListener("message", onMessage);
      registration.active?.postMessage({ type: "CACHE_AI_ASSETS", requestId });
    }).catch(() => resolve(false));
  });
  return state.aiCacheWarmupPromise;
}


export function scheduleAiWarmup() {
  if (state.aiWarmupScheduled || !navigator.onLine) return;
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2;
  const lowCpu = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  if (lowMemory || lowCpu) return;

  state.aiWarmupScheduled = true;
  window.setTimeout(() => {
    const warmup = () => {
      // Only download the model files here. Loading the model takes over the
      // CPU for a minute or more, which made everything else (the Telugu and
      // Hindi voices especially) lag, so it is loaded when a question needs it.
      requestAiAssetCache();
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(warmup, { timeout: 1200 });
    }
    else {
      warmup();
    }
  }, 2200);
}
