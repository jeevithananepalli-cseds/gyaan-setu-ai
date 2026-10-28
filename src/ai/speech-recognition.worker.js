// On-device speech recognition for spoken questions, so voice input works
// without the internet.
//
// Runs Whisper models with transformers.js, one per language:
//   English  whisper-base.en                                 (OpenAI)
//   Telugu   whisper-telugu-base, fine-tuned by IIT Madras (Vistaar)
//   Hindi    whisper-base-hindi, fine-tuned by Collabora
// Each is about 80 MB, downloaded the first time it is needed and kept in its
// own cache, so it does not depend on the service worker.
//
// Messages in:
//   { type: "transcribe", id, language, audio (Float32Array, 16 kHz mono), baseUrl, threads }
//   { type: "preload", id, language, baseUrl, threads, download }
// Messages out:
//   { type: "status", id, language, phase: "downloading", percent }
//   { type: "status", id, language, phase: "loading" }
//   { type: "result", id, text }
//   { type: "preloaded", id, loaded }
//   { type: "error", id, error }
import { MATCH_OPTIONS, SPEECH_CACHE_NAME, modelsBaseUrl } from "../config/constants.js";
import { SPEECH_MODELS, isUsableTranscript } from "./speech-recognition-models.js";

let runtime = null;
let modelsUrl = "";
const recognisers = new Map();

// Requests are handled strictly one after another.
let queue = Promise.resolve();

async function openCache() {
  try {
    return await caches.open(SPEECH_CACHE_NAME);
  }
  catch {
    return null;
  }
}

// The runtime is vendored in public/vendor/onnx and loaded by URL so the build
// does not bundle it. baseUrl is the app's root URL, sent by the page.
async function loadRuntime(baseUrl, threads) {
  if (runtime) return;

  const loaded = await import(/* @vite-ignore */ `${baseUrl}vendor/onnx/transformers.min.js`);
  const { env } = loaded;

  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = modelsBaseUrl(baseUrl);

  // Keep the model files in our own cache: once a language has been used,
  // recognising it needs no network at all.
  env.useBrowserCache = false;
  const cache = await openCache();
  if (cache) {
    env.useCustomCache = true;
    env.customCache = {
      match: key => cache.match(key, MATCH_OPTIONS),
      put: async (key, response) => {
        try {
          await cache.put(key, response);
        }
        catch {
          // A full device: the model still works this time from memory.
        }
      }
    };
  }

  env.backends.onnx.wasm.wasmPaths = `${baseUrl}vendor/onnx/`;
  env.backends.onnx.wasm.numThreads = self.crossOriginIsolated
    ? Math.max(1, Math.min(threads || 1, navigator.hardwareConcurrency || 1))
    : 1;

  modelsUrl = env.localModelPath;
  runtime = loaded;
}

async function isDownloaded(language) {
  const cache = await openCache();
  const model = SPEECH_MODELS[language];
  return Boolean(cache && model && (await cache.match(`${modelsUrl}${model.folder}/${model.readyFile}`, MATCH_OPTIONS)));
}

function loadRecogniser(language, report) {
  if (!recognisers.has(language)) {
    const model = SPEECH_MODELS[language];
    let lastPercent = -1;

    const loading = runtime.pipeline("automatic-speech-recognition", model.folder, {
      dtype: { encoder_model: "q8", decoder_model_merged: "q8" },
      device: "wasm",
      progress_callback: progress => {
        // The two model files make up nearly all of the download.
        if (progress.status !== "progress" || !/onnx$/.test(progress.file || "")) return;
        const percent = Math.floor(progress.progress || 0);
        if (percent !== lastPercent) {
          lastPercent = percent;
          report("downloading", percent);
        }
      }
    });

    // A failed load must not be remembered, or recognition could never recover.
    loading.catch(() => recognisers.delete(language));
    recognisers.set(language, loading);
  }

  return recognisers.get(language);
}

async function transcribe(message) {
  const model = SPEECH_MODELS[message.language];
  if (!model) throw new Error(`no speech model for ${message.language}`);

  const report = (phase, percent) => self.postMessage({
    type: "status", id: message.id, language: message.language, phase, percent
  });

  await loadRuntime(message.baseUrl, message.threads);
  const wasLoaded = recognisers.has(message.language);
  const recogniser = await loadRecogniser(message.language, report);
  if (!wasLoaded) report("loading");

  const result = await recogniser(message.audio, model.options);
  const text = String(result?.text || "").trim();

  // Whisper makes up words for silence or noise ("Thank you.", "[Music]").
  return isUsableTranscript(text, message.language) ? text : "";
}

async function preload(message) {
  if (!SPEECH_MODELS[message.language]) return false;
  await loadRuntime(message.baseUrl, message.threads);
  if (!message.download && !recognisers.has(message.language) && !(await isDownloaded(message.language))) {
    return false;
  }
  const report = (phase, percent) => self.postMessage({
    type: "status", id: message.id, language: message.language, phase, percent
  });
  await loadRecogniser(message.language, report);
  return true;
}

self.onmessage = event => {
  const message = event.data || {};

  if (message.type === "preload") {
    queue = queue
      .then(() => preload(message))
      .catch(() => false)
      .then(loaded => self.postMessage({ type: "preloaded", id: message.id, loaded }));
    return;
  }

  if (message.type !== "transcribe") return;

  queue = queue
    .then(() => transcribe(message))
    .then(text => self.postMessage({ type: "result", id: message.id, text }))
    .catch(error => {
      self.postMessage({ type: "error", id: message.id, error: error.message || String(error) });
    });
};
