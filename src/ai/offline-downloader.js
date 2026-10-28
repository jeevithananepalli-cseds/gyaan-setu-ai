// Gyaan Setu One-Tap Offline AI Model Package Downloader
// Downloads and caches the AI tutor, voice, translation, and speech models
// needed for the learner's chosen language, enabling 100% offline functionality.

import {
  AI_CACHE_NAME,
  AI_READY_MARKER,
  MATCH_OPTIONS,
  OFFLINE_AI_MODEL,
  SPEECH_CACHE_NAME,
  TRANSLATOR_CACHE_NAME,
  VOICE_CACHE_NAME,
  modelsBaseUrl
} from "../config/constants.js";

const SMOL_LM_FILES = [
  "config.json",
  "merges.txt",
  "special_tokens_map.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "vocab.json",
  "onnx/model_q4f16.onnx.part-aa",
  "onnx/model_q4f16.onnx.part-ab",
  "onnx/model_q4f16.onnx.part-ac"
];

const TTS_FILES = [
  "added_tokens.json",
  "config.json",
  "special_tokens_map.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "vocab.json",
  "onnx/model.onnx.part-aa",
  "onnx/model.onnx.part-ab"
];

const INDICTRANS_EN_INDIC = [
  "decoder_model.onnx",
  "decoder_shared.onnx.data.part-aa",
  "decoder_shared.onnx.data.part-ab",
  "decoder_shared.onnx.data.part-ac",
  "decoder_with_past_model.onnx",
  "encoder_model.onnx",
  "encoder_model.onnx.data",
  "generation_config.json",
  "manifest.json",
  "tokenizer_meta.json",
  "tokenizer_src.json",
  "tokenizer_tgt.json"
];

const INDICTRANS_INDIC_EN = [
  "decoder_model.onnx",
  "decoder_shared.onnx.data.part-aa",
  "decoder_shared.onnx.data.part-ab",
  "decoder_with_past_model.onnx",
  "encoder_model.onnx",
  "encoder_model.onnx.data.part-aa",
  "encoder_model.onnx.data.part-ab",
  "generation_config.json",
  "manifest.json",
  "tokenizer_meta.json",
  "tokenizer_src.json",
  "tokenizer_tgt.json"
];

const WHISPER_FILES = [
  "added_tokens.json",
  "config.json",
  "generation_config.json",
  "merges.txt",
  "normalizer.json",
  "preprocessor_config.json",
  "special_tokens_map.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "vocab.json",
  "onnx/decoder_model_merged_quantized.onnx",
  "onnx/encoder_model_quantized.onnx"
];

const RUNTIME_VENDOR_FILES = [
  "vendor/onnx/transformers.min.js",
  "vendor/onnx/ort-wasm-simd-threaded.jsep.wasm",
  "vendor/onnx/ort-wasm-simd-threaded.jsep.mjs",
  "vendor/onnx/ort.webgpu.min.mjs"
];

function getAppBase() {
  return new URL("./", document.baseURI).href;
}

export function getLanguageTtsCode(language) {
  if (language === "te") return "mms-tts-tel";
  if (language === "hi") return "mms-tts-hin";
  return "mms-tts-eng";
}

export async function isOfflinePackageDownloaded(language = "en") {
  if (!("caches" in window)) return false;
  try {
    const aiCache = await caches.open(AI_CACHE_NAME);
    const hasAi = await aiCache.match(AI_READY_MARKER, MATCH_OPTIONS);
    if (!hasAi) return false;

    const voiceCode = getLanguageTtsCode(language);
    const voiceCache = await caches.open(VOICE_CACHE_NAME);
    const voiceMarker = await voiceCache.match(`./models/tts/${voiceCode}/ready-v1`, MATCH_OPTIONS);
    if (!voiceMarker) return false;

    if (language === "te" || language === "hi") {
      const transCache = await caches.open(TRANSLATOR_CACHE_NAME);
      const m1 = await transCache.match("./models/indictrans2/en-indic/ready-v1", MATCH_OPTIONS);
      const m2 = await transCache.match("./models/indictrans2/indic-en/ready-v1", MATCH_OPTIONS);
      if (!m1 || !m2) return false;
    } else {
      const speechCache = await caches.open(SPEECH_CACHE_NAME);
      const sm = await speechCache.match("./models/whisper/whisper-base.en/ready-v1", MATCH_OPTIONS);
      if (!sm) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function downloadOfflinePackage(language = "en", onProgress = () => {}) {
  if (!("caches" in window)) {
    throw new Error("CacheStorage is not supported on this browser.");
  }
  if (!navigator.onLine) {
    throw new Error("Internet connection is required to download offline models.");
  }

  const appBase = getAppBase();
  const modelsBase = modelsBaseUrl(appBase);
  const voiceCode = getLanguageTtsCode(language);

  // Compile tasks: list of { cacheName, url, cacheKey, readyMarker }
  const tasks = [];

  // 1. AI Tutor runtime
  for (const file of RUNTIME_VENDOR_FILES) {
    tasks.push({
      cacheName: AI_CACHE_NAME,
      url: `${appBase}${file}`,
      cacheKey: `./${file}`
    });
  }

  // 2. AI Tutor model (SmolLM2)
  for (const file of SMOL_LM_FILES) {
    tasks.push({
      cacheName: AI_CACHE_NAME,
      url: `${modelsBase}${OFFLINE_AI_MODEL}/${file}`,
      cacheKey: `${modelsBase}${OFFLINE_AI_MODEL}/${file}`
    });
  }

  // 3. Voice TTS for chosen language
  for (const file of TTS_FILES) {
    tasks.push({
      cacheName: VOICE_CACHE_NAME,
      url: `${modelsBase}tts/${voiceCode}/${file}`,
      cacheKey: `${modelsBase}tts/${voiceCode}/${file}`
    });
  }

  // 4. Translator or Speech Recognition
  if (language === "te" || language === "hi") {
    for (const file of INDICTRANS_EN_INDIC) {
      tasks.push({
        cacheName: TRANSLATOR_CACHE_NAME,
        url: `${modelsBase}indictrans2/en-indic/${file}`,
        cacheKey: `${modelsBase}indictrans2/en-indic/${file}`
      });
    }
    for (const file of INDICTRANS_INDIC_EN) {
      tasks.push({
        cacheName: TRANSLATOR_CACHE_NAME,
        url: `${modelsBase}indictrans2/indic-en/${file}`,
        cacheKey: `${modelsBase}indictrans2/indic-en/${file}`
      });
    }
  } else {
    for (const file of WHISPER_FILES) {
      tasks.push({
        cacheName: SPEECH_CACHE_NAME,
        url: `${modelsBase}whisper/whisper-base.en/${file}`,
        cacheKey: `${modelsBase}whisper/whisper-base.en/${file}`
      });
    }
  }

  const total = tasks.length;
  let completed = 0;

  // Cache handles
  const cachesMap = new Map();
  async function getCache(name) {
    if (!cachesMap.has(name)) {
      cachesMap.set(name, await caches.open(name));
    }
    return cachesMap.get(name);
  }

  onProgress({
    current: 0,
    total,
    percent: 0,
    statusText: "Starting download..."
  });

  // Download with concurrency limit of 3 to avoid saturating network
  const CONCURRENCY = 3;
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index++;
      const task = tasks[taskIndex];
      const cache = await getCache(task.cacheName);

      // Check if already in cache
      const existing = await cache.match(task.cacheKey, MATCH_OPTIONS);
      if (!existing) {
        const response = await fetch(task.url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to download ${task.url} (Status ${response.status})`);
        }
        await cache.put(task.cacheKey, response);
      }

      completed++;
      const percent = Math.round((completed / total) * 100);
      onProgress({
        current: completed,
        total,
        percent,
        statusText: `Downloading: ${percent}% (${completed}/${total})`
      });
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker());
  await Promise.all(workers);

  // Write all ready markers
  const aiCache = await getCache(AI_CACHE_NAME);
  await aiCache.put(AI_READY_MARKER, new Response("ready"));

  const voiceCache = await getCache(VOICE_CACHE_NAME);
  await voiceCache.put(`./models/tts/${voiceCode}/ready-v1`, new Response("ready"));

  if (language === "te" || language === "hi") {
    const transCache = await getCache(TRANSLATOR_CACHE_NAME);
    await transCache.put("./models/indictrans2/en-indic/ready-v1", new Response("ready"));
    await transCache.put("./models/indictrans2/indic-en/ready-v1", new Response("ready"));
  } else {
    const speechCache = await getCache(SPEECH_CACHE_NAME);
    await speechCache.put("./models/whisper/whisper-base.en/ready-v1", new Response("ready"));
  }

  onProgress({
    current: total,
    total,
    percent: 100,
    statusText: "All models downloaded! 100% offline ready."
  });

  return true;
}
