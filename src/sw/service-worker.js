// Gyaan Setu service worker.
//
// Two caches:
//   - the app cache holds the built app shell and lesson images. The build
//     injects the file list below, and the cache name is derived from it, so
//     every deploy that changes a file gets a fresh cache automatically.
//   - the AI cache holds the on-device model and its runtime (about 290 MB).
//     Its name never changes, so learners download the model only once.
//
// The bundled voices and the translation models keep their own caches
// (VOICE_CACHE_NAME, TRANSLATOR_CACHE_NAME), filled by their workers. This
// worker only has to leave those caches alone.

import {
  AI_CACHE_NAME,
  AI_READY_MARKER,
  SPEECH_CACHE_NAME,
  TRANSLATOR_CACHE_NAME,
  VOICE_CACHE_NAME,
  modelsBaseUrl
} from "../config/constants.js";

const PRECACHE_ENTRIES = self.__WB_MANIFEST;

function hashText(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

const CACHE_NAME = `gyaan-setu-${hashText(JSON.stringify(PRECACHE_ENTRIES))}`;

// Some servers send "Vary: Origin", and the built page loads its script and
// stylesheet with the crossorigin attribute, so a header-sensitive lookup can
// miss files that are in the cache. Match on the URL alone.
const MATCH_OPTIONS = { ignoreVary: true };

const APP_FILES = [
  "./",
  ...PRECACHE_ENTRIES.map(entry => `./${entry.url}`)
];

const AI_RUNTIME_FILES = [
  "transformers.min.js",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs"
];

// The models are served by the app itself or, in production, from a
// separate host (VITE_MODELS_URL).
const MODELS_URL = modelsBaseUrl(new URL("./", self.registration.scope).href);

const AI_FILES = [
  ...AI_RUNTIME_FILES.map(file => `./vendor/onnx/${file}`),
  ...[
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
    "vocab.json",
    "merges.txt",
    "onnx/model_q4f16.onnx.part-aa",
    "onnx/model_q4f16.onnx.part-ab",
    "onnx/model_q4f16.onnx.part-ac"
  ].map(file => `${MODELS_URL}SmolLM2-360M-Instruct/${file}`)
];

// Files over GitHub's 100 MB limit are stored as parts (see
// scripts/split-model.js) and served to the runtime as one file.
const SPLIT_FILES = {
  [`${MODELS_URL}SmolLM2-360M-Instruct/onnx/model_q4f16.onnx`]: ["aa", "ab", "ac"]
};

function findSplitFile(url) {
  const address = url.split("?")[0];
  return Object.keys(SPLIT_FILES).find(file => address === file) || null;
}

// A model file's path under the models address, or null for other requests.
function modelPath(url) {
  return url.startsWith(MODELS_URL) ? url.slice(MODELS_URL.length) : null;
}

// Returns the whole file, taking each part from the AI cache or, when it is
// not there yet, from the network (and keeping it for next time).
async function serveSplitFile(file) {
  const cache = await caches.open(AI_CACHE_NAME);

  const parts = await Promise.all(
    SPLIT_FILES[file].map(async suffix => {
      const partUrl = `${file}.part-${suffix}`;
      const cached = await cache.match(partUrl, MATCH_OPTIONS);
      if (cached) return cached;

      const response = await fetch(partUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Unable to load ${partUrl}: ${response.status}`);

      await cache.put(partUrl, response.clone());
      return response;
    })
  );

  const blob = new Blob(await Promise.all(parts.map(part => part.arrayBuffer())));

  // The size matters: without Content-Length the model runtime grows its
  // buffer and copies everything read so far for every chunk that arrives,
  // which made the 273 MB model take over four minutes to load.
  return new Response(blob, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(blob.size)
    }
  });
}

// Marks a response as safe for a cross-origin isolated page. Isolation is
// what lets the AI runtime use several CPU threads, which makes the bundled
// voices and the model several times faster. Static hosts such as GitHub
// Pages cannot send these headers, so the service worker adds them; they take
// effect from the second visit, once this worker controls the page.
function withIsolationHeaders(response) {
  if (!response || response.status === 0 || response.type === "opaque") return response;
  // Files from the models host are read with CORS and need nothing added.
  if (response.url && new URL(response.url).origin !== self.location.origin) return response;

  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function cacheApplicationFiles(cache, files) {
  await Promise.all(
    [...new Set(files.filter(Boolean))].map(async file => {
      const separator = file.includes("?") ? "&" : "?";
      const response = await fetch(
        `${file}${separator}cacheBust=${encodeURIComponent(CACHE_NAME)}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`Unable to cache ${file}: ${response.status}`);
      }
      await cache.put(file, response);
    })
  );
}

// Installs made before the runtime moved from ./runtime/ to ./vendor/onnx/
// already hold these files; re-key them so nothing is downloaded again.
async function migrateAiCache() {
  if (!(await caches.has(AI_CACHE_NAME))) return;

  const cache = await caches.open(AI_CACHE_NAME);

  for (const file of AI_RUNTIME_FILES) {
    const previous = await cache.match(`./runtime/${file}`);
    if (!previous) continue;
    await cache.put(`./vendor/onnx/${file}`, previous);
    await cache.delete(`./runtime/${file}`);
  }

  await cache.delete("./ort-wasm-simd-threaded.jsep.wasm");
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cacheApplicationFiles(cache, APP_FILES);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => ![CACHE_NAME, AI_CACHE_NAME, VOICE_CACHE_NAME, TRANSLATOR_CACHE_NAME, SPEECH_CACHE_NAME].includes(key))
        .map(key => caches.delete(key))
    );
    await migrateAiCache();
  })());
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestPath = new URL(event.request.url).pathname;
  const model = modelPath(event.request.url);
  const isAiRequest = requestPath.includes("/vendor/onnx/") || model !== null;

  // Voice, translation and speech files are stored by their workers in their
  // own caches; storing them here as well would keep two copies of each model.
  if (model !== null && /^(tts|indictrans2|whisper)\//.test(model)) {
    event.respondWith(fetch(event.request).then(withIsolationHeaders));
    return;
  }

  const splitFile = findSplitFile(event.request.url);

  if (splitFile) {
    event.respondWith(
      serveSplitFile(splitFile)
        .then(withIsolationHeaders)
        .catch(() => fetch(event.request))
    );
    return;
  }

  if (isAiRequest) {
    event.respondWith(
      caches.open(AI_CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request, MATCH_OPTIONS);
        if (cached) return withIsolationHeaders(cached);
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return withIsolationHeaders(response);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, MATCH_OPTIONS).then(cached => {
      if (cached) return withIsolationHeaders(cached);
      return fetch(event.request).then(response => {
        if (response.ok || response.type === "opaque") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return withIsolationHeaders(response);
      }).catch(async () => {
        if (event.request.mode === "navigate") {
          return withIsolationHeaders(await caches.match("./index.html", MATCH_OPTIONS));
        }
        return undefined;
      });
    })
  );
});

self.addEventListener("message", event => {
  if (event.data?.type !== "CACHE_AI_ASSETS") return;

  const cacheAssets = async () => {
    try {
      const cache = await caches.open(AI_CACHE_NAME);
      const missing = [];
      for (const file of AI_FILES) {
        if (!(await cache.match(file, MATCH_OPTIONS))) missing.push(file);
      }
      const responses = await Promise.all(
        missing.map(file => fetch(file, { cache: "no-store" }))
      );
      if (responses.some(response => !response.ok)) {
        throw new Error("One or more AI assets could not be cached.");
      }
      await Promise.all(
        missing.map((file, index) => cache.put(file, responses[index]))
      );
      await cache.put(AI_READY_MARKER, new Response("ready"));
      event.source?.postMessage({
        type: "AI_CACHE_READY",
        version: "v1",
        requestId: event.data.requestId
      });
    }
    catch (error) {
      event.source?.postMessage({
        type: "AI_CACHE_ERROR",
        requestId: event.data.requestId,
        error: error.message || String(error)
      });
    }
  };

  event.waitUntil(cacheAssets());
});
