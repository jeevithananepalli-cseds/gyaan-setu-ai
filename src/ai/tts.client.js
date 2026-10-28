// Page-side handle on the bundled voices (see tts.worker.js).
//
// The browser's own voices are used when the device has one for the language.
// These bundled voices cover English, Telugu and Hindi on devices that do
// not, and offline when the device only has online voices.
import { getItem, setItem } from "../core/storage.js";

export const BUNDLED_VOICE_LANGUAGES = ["English", "Telugu", "Hindi"];

// Several CPU threads make speech about twice as fast, but in some browsers
// the threaded engine never finishes starting. If that happens the voice is
// restarted on one thread, and that choice is remembered on this device for
// a week, then threads are tried again.
//
// The timeout is long on purpose: a busy computer can take well over a minute
// to start the voice, and treating that as a hang made the voice permanently
// about twice as slow. (The key was renamed so devices caught by the earlier
// 45-second timeout get threads back.)
const SINGLE_THREAD_KEY = "gyaanVoiceSingleThreadUntil";
const SINGLE_THREAD_DAYS = 7;
// Measured on a 12-thread laptop: 8 threads took about 7 s per 6 s of
// speech, 4 threads 10-13 s, 1 thread 10-20 s. The worker uses fewer on
// devices with fewer cores.
const DEFAULT_THREADS = 8;
const START_TIMEOUT_MS = 90000;

let worker = null;
let nextId = 0;
let session = 0;
let startWatchdog = null;

// id -> { resolve, reject, onStatus, payload, keep }
const pending = new Map();

// Languages whose voice has finished loading in the worker.
const readyVoices = new Set();

// Background work never belongs to a read-aloud, so stopping one leaves it.
const BACKGROUND_SESSION = Number.MAX_SAFE_INTEGER;

export function isVoiceReady(language) {
  return readyVoices.has(language);
}

export function hasBundledVoice(language) {
  return (
    BUNDLED_VOICE_LANGUAGES.includes(language) &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    Boolean(window.AudioContext || window.webkitAudioContext)
  );
}

// gyaanVoiceThreads overrides the thread count, for measuring on a device.
const THREADS_OVERRIDE_KEY = "gyaanVoiceThreads";

function threadCount() {
  if (Number(getItem(SINGLE_THREAD_KEY)) > Date.now()) return 1;
  return Number(getItem(THREADS_OVERRIDE_KEY)) || DEFAULT_THREADS;
}

function clearWatchdog() {
  clearTimeout(startWatchdog);
  startWatchdog = null;
}

function stopWorker() {
  clearWatchdog();
  if (worker) worker.terminate();
  worker = null;
}

function rejectAll(error) {
  pending.forEach(request => request.reject(error));
  pending.clear();
}

// The engine has been "starting" for too long. Start again on one thread and
// resend whatever was waiting.
function restartOnOneThread() {
  if (threadCount() === 1) {
    stopWorker();
    rejectAll(new Error("The voice engine did not start"));
    return;
  }

  console.warn("Bundled voice did not start with threads; retrying on one thread.");
  setItem(SINGLE_THREAD_KEY, String(Date.now() + SINGLE_THREAD_DAYS * 24 * 60 * 60 * 1000));
  stopWorker();
  readyVoices.clear();

  pending.forEach(request => {
    getWorker().postMessage({ ...request.payload, threads: 1 });
  });
}

function getWorker() {
  if (worker) return worker;

  worker = new Worker(new URL("./tts.worker.js", import.meta.url), { type: "module" });

  worker.onmessage = event => {
    const message = event.data || {};
    const request = pending.get(message.id);

    if (message.type === "status" && message.phase === "ready") {
      readyVoices.add(message.language);
    }

    if (message.type === "status") {
      // Downloading can take as long as the connection needs; only the
      // engine start-up is timed.
      clearWatchdog();
      if (message.phase === "starting") {
        startWatchdog = setTimeout(restartOnOneThread, START_TIMEOUT_MS);
      }
      request?.onStatus?.(message);
      return;
    }

    clearWatchdog();
    if (!request) return;
    pending.delete(message.id);

    if (message.type === "audio") {
      request.resolve({ audio: message.audio, samplingRate: message.samplingRate });
    }
    else if (message.type === "preloaded") {
      request.resolve();
    }
    else {
      request.reject(new Error(message.error || "Voice failed"));
    }
  };

  worker.onerror = event => {
    stopWorker();
    readyVoices.clear();
    rejectAll(new Error(event.message || "Voice worker failed"));
  };

  return worker;
}

// Starts a new read-aloud. Audio requested under an older session is dropped.
export function startVoiceSession() {
  cancelBundledVoice();
  return session;
}

// Abandons everything queued so far (the learner pressed stop, or asked for
// something else to be read). A voice that is still loading keeps loading, so
// it is ready next time.
export function cancelBundledVoice() {
  if (worker) worker.postMessage({ type: "cancel", session });
  session += 1;

  const error = new Error("cancelled");
  error.cancelled = true;
  pending.forEach((request, id) => {
    if (request.keep) return;
    request.reject(error);
    pending.delete(id);
  });
}

const preloaded = new Set();

// Loads a voice in the background if it has been downloaded before, so the
// next answer in that language starts quickly. Does nothing otherwise.
export function preloadBundledVoice(language) {
  if (!hasBundledVoice(language) || preloaded.has(language)) return;
  preloaded.add(language);

  const id = ++nextId;
  const payload = {
    type: "preload",
    id,
    language,
    threads: threadCount(),
    baseUrl: new URL("./", document.baseURI).href
  };

  // Not cancelled by stop: a voice that is loading should finish loading.
  pending.set(id, { resolve() {}, reject() {}, payload, keep: true });
  getWorker().postMessage(payload);
}

// Resolves with { audio: Float32Array, samplingRate }. The promise has an
// `id` for cancelRequests().
// onStatus({ phase, percent }) reports a voice being prepared:
//   phase "downloading" (with percent), "starting", then "ready".
// options.background: preparing ahead of time; stopping a read-aloud does not
// cancel it.
export function synthesizeSpeech(language, text, voiceSession, onStatus, options = {}) {
  const id = ++nextId;

  const promise = new Promise((resolve, reject) => {
    const payload = {
      type: "synthesize",
      id,
      session: options.background ? BACKGROUND_SESSION : voiceSession,
      language,
      text,
      threads: threadCount(),
      baseUrl: new URL("./", document.baseURI).href
    };

    pending.set(id, { resolve, reject, onStatus, payload, keep: Boolean(options.background) });
    getWorker().postMessage(payload);
  });

  promise.id = id;
  return promise;
}

// Drops specific requests that have not been spoken yet.
export function cancelRequests(ids) {
  const waiting = ids.filter(id => pending.has(id));
  if (!waiting.length) return;

  if (worker) worker.postMessage({ type: "cancel-ids", ids: waiting });

  const error = new Error("cancelled");
  error.cancelled = true;
  waiting.forEach(id => {
    pending.get(id).reject(error);
    pending.delete(id);
  });
}
