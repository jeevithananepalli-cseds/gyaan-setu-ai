// Bundled English, Telugu and Hindi voices.
//
// Runs Meta's MMS text-to-speech models (VITS) on the device, for learners
// whose phone or computer has no voice installed for their language, or only
// online voices while there is no connection. The page sends a sentence and
// gets back raw audio samples to play.
//
// Messages in:
//   { type: "synthesize", id, session, language, text, baseUrl, threads }
//   { type: "preload", id, language, baseUrl, threads }
//                                   load a voice that is already downloaded
//   { type: "cancel", session }     drop queued work up to this session
//   { type: "cancel-ids", ids }     drop these queued requests
// Messages out:
//   { type: "status", id, language, phase: "downloading", percent }
//   { type: "status", id, language, phase: "starting" }
//   { type: "status", id, language, phase: "ready" }
//   { type: "audio", id, audio, samplingRate }
//   { type: "preloaded", id }
//   { type: "error", id, error }
import { MATCH_OPTIONS, VOICE_CACHE_NAME, modelsBaseUrl } from "../config/constants.js";

const VOICE_MODELS = {
  English: "tts/mms-tts-eng",
  Telugu: "tts/mms-tts-tel",
  Hindi: "tts/mms-tts-hin"
};

// Each model.onnx is stored as parts because of GitHub's 100 MB file limit
// (see scripts/split-model.js).
const MODEL_PARTS = ["aa", "ab"];

let runtime = null;
let modelsUrl = "";
let cancelledThrough = -1;
const cancelledIds = new Set();

// One loaded voice per language, kept for the life of the worker.
const voices = new Map();

// Requests are handled strictly one after another.
let queue = Promise.resolve();

async function openVoiceCache() {
  try {
    return await caches.open(VOICE_CACHE_NAME);
  }
  catch {
    // No cache storage (private browsing, storage blocked).
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

  // Keep voice files in our own cache. The runtime reads every file from it
  // first, so once a voice has been used it needs no network at all.
  env.useBrowserCache = false;
  const cache = await openVoiceCache();
  if (cache) {
    env.useCustomCache = true;
    env.customCache = {
      match: key => cache.match(key, MATCH_OPTIONS),
      put: (key, response) => cache.put(key, response)
    };
  }

  env.backends.onnx.wasm.wasmPaths = `${baseUrl}vendor/onnx/`;
  // More than one thread needs a cross-origin isolated page.
  env.backends.onnx.wasm.numThreads = self.crossOriginIsolated
    ? Math.max(1, Math.min(threads || 1, navigator.hardwareConcurrency || 1))
    : 1;

  modelsUrl = env.localModelPath;
  runtime = loaded;
}

// Downloads one part, reporting how many bytes have arrived.
async function downloadPart(url, onBytes) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`voice file missing (${response.status})`);
  }

  const size = Number(response.headers.get("Content-Length")) || 0;

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onBytes(buffer.byteLength, size || buffer.byteLength);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onBytes(received, size);
  }

  return new Blob(chunks).arrayBuffer();
}

// Joins the model parts into one file and stores it where the runtime will
// look for it. Done here rather than in the service worker so the voices work
// on a first visit, in `npm run dev`, and in browsers where the service
// worker is unavailable.
async function ensureModelFile(name, reportPercent) {
  const modelUrl = `${modelsUrl}${name}/onnx/model.onnx`;
  const cache = await openVoiceCache();

  if (!cache) {
    throw new Error("this browser has no storage available for the voice");
  }

  if (await cache.match(modelUrl, MATCH_OPTIONS)) return;

  const received = MODEL_PARTS.map(() => 0);
  const sizes = MODEL_PARTS.map(() => 0);
  let lastPercent = -1;

  const buffers = await Promise.all(
    MODEL_PARTS.map((suffix, index) =>
      downloadPart(`${modelUrl}.part-${suffix}`, (bytes, size) => {
        received[index] = bytes;
        sizes[index] = size;

        // Wait until every part has reported its size, or the total is a guess.
        if (sizes.some(value => !value)) return;

        const total = sizes.reduce((sum, value) => sum + value, 0);
        const percent = Math.floor((received.reduce((sum, value) => sum + value, 0) / total) * 100);

        if (percent !== lastPercent) {
          lastPercent = percent;
          reportPercent(percent);
        }
      })
    )
  );

  await cache.put(
    modelUrl,
    new Response(new Blob(buffers), {
      headers: { "Content-Type": "application/octet-stream" }
    })
  );
}

function loadVoice(language, report) {
  if (!voices.has(language)) {
    // The tokenizer and model are loaded directly: the ready-made
    // text-to-speech pipeline also asks for files these models do not have.
    const name = VOICE_MODELS[language];

    const loading = ensureModelFile(name, percent => report("downloading", percent))
      .then(() => {
        report("starting");
        return Promise.all([
          runtime.AutoTokenizer.from_pretrained(name),
          runtime.VitsModel.from_pretrained(name, { dtype: "fp32", device: "wasm" })
        ]);
      })
      .then(([tokenizer, model]) => ({ tokenizer, model }));

    // A failed load must not be remembered, or the voice could never recover.
    loading.catch(() => voices.delete(language));
    voices.set(language, loading);
  }

  return voices.get(language);
}

// Gets a voice ready before it is asked to speak, so the first answer is not
// held up by loading. Never downloads: a voice that has not been used on this
// device yet is fetched only when the learner asks to hear something.
async function preload(message) {
  const name = VOICE_MODELS[message.language];
  if (!name || voices.has(message.language)) return;

  await loadRuntime(message.baseUrl, message.threads);

  const cache = await openVoiceCache();
  if (!cache || !(await cache.match(`${modelsUrl}${name}/onnx/model.onnx`, MATCH_OPTIONS))) return;

  const report = phase => self.postMessage({ type: "status", id: message.id, language: message.language, phase });
  await loadVoice(message.language, report);
  report("ready");
}

function isCancelled(message) {
  return message.session <= cancelledThrough || cancelledIds.has(message.id);
}

async function synthesize(message) {
  if (isCancelled(message)) return;

  if (!VOICE_MODELS[message.language]) {
    throw new Error(`no bundled voice for ${message.language}`);
  }

  const report = (phase, percent) => {
    self.postMessage({ type: "status", id: message.id, language: message.language, phase, percent });
  };

  if (!runtime) report("starting");
  await loadRuntime(message.baseUrl, message.threads);

  const wasLoaded = voices.has(message.language);
  const voice = await loadVoice(message.language, report);
  if (!wasLoaded) report("ready");

  if (isCancelled(message)) return;

  const { waveform } = await voice.model(voice.tokenizer(message.text));

  // Copy out of the runtime's memory so the buffer can be handed to the page.
  const audio = new Float32Array(waveform.data);

  self.postMessage(
    { type: "audio", id: message.id, audio, samplingRate: voice.model.config.sampling_rate },
    [audio.buffer]
  );
}

self.onmessage = event => {
  const message = event.data || {};

  if (message.type === "cancel") {
    cancelledThrough = Math.max(cancelledThrough, message.session);
    return;
  }

  if (message.type === "cancel-ids") {
    message.ids.forEach(id => cancelledIds.add(id));
    return;
  }

  if (message.type === "preload") {
    queue = queue
      .then(() => preload(message))
      .catch(() => {})
      .then(() => self.postMessage({ type: "preloaded", id: message.id }));
    return;
  }

  if (message.type !== "synthesize") return;

  queue = queue
    .then(() => synthesize(message))
    .catch(error => {
      self.postMessage({ type: "error", id: message.id, error: error.message || String(error) });
    });
};
