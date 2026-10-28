// Page-side handle on on-device speech recognition (see
// speech-recognition.worker.js).
import { MATCH_OPTIONS, SPEECH_CACHE_NAME, modelsBaseUrl } from "../config/constants.js";
import { canRecord } from "./microphone.js";
import { SPEECH_MODELS } from "./speech-recognition-models.js";

const THREADS = 4;

let worker = null;
let nextId = 0;
const pending = new Map();
const preloaded = new Set();

// The languages whose recogniser ships with the app.
export const ON_DEVICE_SPEECH_LANGUAGES = Object.keys(SPEECH_MODELS).filter(language => SPEECH_MODELS[language].bundled);

export function canRecogniseOnDevice(language) {
  return (
    ON_DEVICE_SPEECH_LANGUAGES.includes(language) &&
    canRecord() &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined"
  );
}

function baseUrl() {
  return new URL("./", document.baseURI).href;
}

function getWorker() {
  if (worker) return worker;

  worker = new Worker(new URL("./speech-recognition.worker.js", import.meta.url), { type: "module" });

  worker.onmessage = event => {
    const message = event.data || {};
    const request = pending.get(message.id);
    if (!request) return;

    if (message.type === "status") {
      request.onStatus?.(message);
      return;
    }

    pending.delete(message.id);
    if (message.type === "result") request.resolve(message.text);
    else if (message.type === "preloaded") request.resolve(message.loaded);
    else request.reject(new Error(message.error || "speech recognition failed"));
  };

  worker.onerror = event => {
    console.error("Speech recognition worker error:", event.message || event);
    const error = new Error("the speech recognition worker stopped");
    pending.forEach(request => request.reject(error));
    pending.clear();
    preloaded.clear();
    worker = null;
  };

  return worker;
}

function send(payload, onStatus, transfer = []) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, onStatus });
    getWorker().postMessage({ ...payload, id, baseUrl: baseUrl(), threads: THREADS }, transfer);
  });
}

// Turns 16 kHz mono samples into text. The first time a language is used its
// model (about 80 MB) is downloaded; onStatus receives
// { phase: "downloading", percent } and { phase: "loading" } meanwhile.
export function transcribeSpeech(audio, language, onStatus) {
  preloaded.add(language);
  return send({ type: "transcribe", audio, language }, onStatus, [audio.buffer]);
}

// True when a language's recogniser is already stored on this device.
export async function isSpeechModelDownloaded(language) {
  const model = SPEECH_MODELS[language];
  if (!model) return false;
  try {
    const cache = await caches.open(SPEECH_CACHE_NAME);
    return Boolean(await cache.match(`${modelsBaseUrl(baseUrl())}${model.folder}/${model.readyFile}`, MATCH_OPTIONS));
  }
  catch {
    return false;
  }
}

// Loads a language's recogniser ahead of time (downloading it only when
// `download` is true), so the first spoken question is answered sooner.
export function preloadSpeechModel(language, { download = false, onStatus } = {}) {
  if (!canRecogniseOnDevice(language)) return Promise.resolve(false);
  if (preloaded.has(language) && !download) return Promise.resolve(false);
  preloaded.add(language);

  return send({ type: "preload", language, download }, onStatus).then(loaded => {
    if (!loaded) preloaded.delete(language);
    return loaded;
  }, error => {
    preloaded.delete(language);
    throw error;
  });
}
