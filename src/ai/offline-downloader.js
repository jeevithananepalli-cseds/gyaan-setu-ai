// "Download for offline use": gets every model a learner's language needs
// onto the device in one go, so the whole app works without the internet,
// not only the features that happened to be used while online.
//
// Each model is downloaded by the code that uses it (the translation worker,
// the voice worker, speech recognition, and the tutor's own files below), so
// it is stored exactly where that code looks for it, and nothing is
// downloaded twice.
import {
  AI_CACHE_NAME,
  AI_READY_MARKER,
  MATCH_OPTIONS,
  OFFLINE_AI_MODEL,
  VOICE_CACHE_NAME,
  modelsBaseUrl
} from "../config/constants.js";
import { requestAiAssetCache } from "./offline-ai.client.js";
import { isSpeechModelDownloaded, preloadSpeechModel } from "./speech-recognition.client.js";
import { isTranslatorDownloaded, preloadTranslator } from "./translator.client.js";
import { startVoiceSession, synthesizeSpeech } from "./tts.client.js";

const TUTOR_PARTS = ["aa", "ab", "ac"];

const VOICE_FOLDERS = {
  English: "mms-tts-eng",
  Telugu: "mms-tts-tel",
  Hindi: "mms-tts-hin"
};

// Download sizes in MB, used to weight the progress bar and shown to the
// learner before they start.
const SIZES = { tutor: 295, voice: 110, speech: 77, "en-indic": 309, "indic-en": 262 };

function appBaseUrl() {
  return new URL("./", document.baseURI).href;
}

function tutorPartUrls() {
  const folder = `${modelsBaseUrl(appBaseUrl())}${OFFLINE_AI_MODEL}/onnx/`;
  return TUTOR_PARTS.map(suffix => `${folder}model_q4f16.onnx.part-${suffix}`);
}

function voiceModelUrl(language) {
  return `${modelsBaseUrl(appBaseUrl())}tts/${VOICE_FOLDERS[language]}/onnx/model.onnx`;
}

// What a language needs. English voice input runs on the device; Telugu and
// Hindi voice input still use the browser's own (online) recognition.
export function offlinePackageSteps(language) {
  const steps = ["tutor"];
  if (language === "Telugu" || language === "Hindi") steps.push("en-indic", "indic-en");
  if (VOICE_FOLDERS[language]) steps.push("voice");
  if (language === "English") steps.push("speech");
  return steps;
}

export function offlinePackageSize(language) {
  return offlinePackageSteps(language).reduce((sum, step) => sum + SIZES[step], 0);
}

async function isStepReady(step, language) {
  if (step === "tutor") {
    const cache = await caches.open(AI_CACHE_NAME);
    const marker = await cache.match(AI_READY_MARKER, MATCH_OPTIONS);
    const parts = await Promise.all(tutorPartUrls().map(url => cache.match(url, MATCH_OPTIONS)));
    return Boolean(marker) && parts.every(Boolean);
  }
  if (step === "en-indic" || step === "indic-en") return isTranslatorDownloaded(step);
  if (step === "voice") {
    const cache = await caches.open(VOICE_CACHE_NAME);
    return Boolean(await cache.match(voiceModelUrl(language), MATCH_OPTIONS));
  }
  if (step === "speech") return isSpeechModelDownloaded("English");
  return false;
}

// True when everything the language needs is already on this device.
export async function isOfflinePackageDownloaded(language) {
  if (typeof caches === "undefined") return false;
  try {
    for (const step of offlinePackageSteps(language)) {
      if (!(await isStepReady(step, language))) return false;
    }
    return true;
  }
  catch {
    return false;
  }
}

// The tutor's runtime and small files are stored by the service worker; its
// three model parts (270 MB) are stored here, under the same addresses the
// tutor worker uses (see downloadModelParts in offline-ai.worker.js).
async function downloadTutor(onPercent) {
  if (!(await requestAiAssetCache())) throw new Error("the AI runtime could not be saved");

  const cache = await caches.open(AI_CACHE_NAME);
  const missing = [];
  for (const url of tutorPartUrls()) {
    if (!(await cache.match(url, MATCH_OPTIONS))) missing.push(url);
  }

  const received = missing.map(() => 0);
  const sizes = missing.map(() => 0);
  await Promise.all(missing.map(async (url, index) => {
    const isExternal = !url.startsWith(location.origin);
    const response = await fetch(url, isExternal
      ? { mode: "cors", credentials: "omit", cache: "no-store" }
      : { cache: "no-store" });
    if (!response.ok) throw new Error(`model file missing (${response.status})`);
    sizes[index] = Number(response.headers.get("Content-Length")) || 1;

    const reader = response.body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received[index] += value.byteLength;
      if (sizes.every(Boolean)) {
        const total = sizes.reduce((sum, size) => sum + size, 0);
        onPercent(received.reduce((sum, bytes) => sum + bytes, 0) / total * 100);
      }
    }
    await cache.put(url, new Response(new Blob(chunks), {
      headers: { "Content-Type": "application/octet-stream" }
    }));
  }));
}

async function runStep(step, language, onPercent) {
  const fromStatus = status => {
    if (typeof status?.percent === "number") onPercent(status.percent);
  };

  if (step === "tutor") return downloadTutor(onPercent);

  if (step === "en-indic" || step === "indic-en") {
    const loaded = await preloadTranslator(step, { download: true, load: false, onStatus: fromStatus });
    if (!loaded) throw new Error("the translator could not be downloaded");
    return;
  }

  // Saying one word downloads the voice, loads it and proves it works.
  if (step === "voice") return synthesizeSpeech(language, "Gyaan", startVoiceSession(), fromStatus);

  if (step === "speech") {
    const loaded = await preloadSpeechModel("English", { download: true, onStatus: fromStatus });
    if (!loaded) throw new Error("voice input could not be downloaded");
  }
}

// Downloads everything `language` needs. onProgress receives a whole number
// from 0 to 100 for the package as a whole.
export async function downloadOfflinePackage(language, onProgress = () => {}) {
  if (typeof caches === "undefined") throw new Error("this browser cannot store files for offline use");
  if (!navigator.onLine) throw new Error("connect to the internet to download");

  const steps = offlinePackageSteps(language);
  const total = steps.reduce((sum, step) => sum + SIZES[step], 0);
  let current = steps[0];
  // MB of finished steps.
  let done = 0;
  let last = -1;
  const report = stepPercent => {
    const megabytes = done + (Math.min(100, stepPercent) / 100) * SIZES[current];
    const percent = Math.min(99, Math.floor((megabytes / total) * 100));
    if (percent !== last) {
      last = percent;
      onProgress(percent);
    }
  };

  report(0);
  for (const step of steps) {
    current = step;
    if (!(await isStepReady(step, language))) await runStep(step, language, report);
    done += SIZES[step];
    report(0);
  }

  if (!(await isOfflinePackageDownloaded(language))) {
    throw new Error("some files could not be saved on this device");
  }
  onProgress(100);
}
