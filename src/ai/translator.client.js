// Page-side handle on the translation models (see translator.worker.js).
import { MATCH_OPTIONS, TRANSLATOR_CACHE_NAME, modelsBaseUrl } from "../config/constants.js";
import { translationDirection } from "./translation-text.js";

const THREADS = 4;

let worker = null;
let nextId = 0;

// id -> { resolve, reject, onStatus }
const pending = new Map();

// Directions loaded in the worker, or being loaded.
const preloaded = new Set();

export function canTranslate() {
  return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

function baseUrl() {
  return new URL("./", document.baseURI).href;
}

function getWorker() {
  if (worker) return worker;

  worker = new Worker(new URL("./translator.worker.js", import.meta.url), { type: "module" });

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
    else request.reject(new Error(message.error || "translation failed"));
  };

  worker.onerror = event => {
    console.error("Translation worker error:", event.message || event);
    const error = new Error("the translation worker stopped");
    pending.forEach(request => request.reject(error));
    pending.clear();
    preloaded.clear();
    worker = null;
  };

  return worker;
}

function send(payload, onStatus) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, onStatus });
    getWorker().postMessage({ ...payload, id, baseUrl: baseUrl(), threads: THREADS });
  });
}

// Translates text between English, Telugu and Hindi. The first time a
// direction is used its model is downloaded (about 300 MB); onStatus receives
// { phase: "downloading", percent } and { phase: "loading" } meanwhile.
export function translateText(text, from, to, onStatus) {
  if (from === to || !String(text || "").trim()) return Promise.resolve(text);
  if (!canTranslate()) return Promise.reject(new Error("translation is not supported in this browser"));

  preloaded.add(translationDirection(from, to));
  return send({ type: "translate", text, from, to }, onStatus);
}

// True when a direction's model is already stored on this device.
export async function isTranslatorDownloaded(direction) {
  try {
    const cache = await caches.open(TRANSLATOR_CACHE_NAME);
    return Boolean(await cache.match(`${modelsBaseUrl(baseUrl())}indictrans2/${direction}/ready-v1`, MATCH_OPTIONS));
  }
  catch {
    return false;
  }
}

// Loads a direction into memory ahead of time so the first translation does
// not wait for it. Downloads it only when `download` is true.
export function preloadTranslator(direction, { download = false, onStatus } = {}) {
  if (!canTranslate() || preloaded.has(direction)) return Promise.resolve(false);
  preloaded.add(direction);

  return send({ type: "preload", direction, download }, onStatus).then(loaded => {
    if (!loaded) preloaded.delete(direction);
    return loaded;
  }, error => {
    preloaded.delete(direction);
    throw error;
  });
}
