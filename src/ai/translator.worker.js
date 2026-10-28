// On-device translation between English and Telugu or Hindi.
//
// Runs AI4Bharat's IndicTrans2 (distilled 200M, 8-bit ONNX), one model per
// direction: "en-indic" (English to Telugu/Hindi) and "indic-en" (Telugu or
// Hindi to English). It lets the English tutor model answer questions asked
// in any of the three languages, and its answers be read in Telugu or Hindi.
//
// Messages in:
//   { type: "translate", id, text, from, to, baseUrl, threads }
//   { type: "preload", id, direction, baseUrl, threads, download }
//                       load a direction; download it only if `download`
// Messages out:
//   { type: "status", id, direction, phase: "downloading", percent }
//   { type: "status", id, direction, phase: "loading" }
//   { type: "result", id, text }
//   { type: "preloaded", id, loaded }
//   { type: "error", id, error }
import { MATCH_OPTIONS, TRANSLATOR_CACHE_NAME, modelsBaseUrl } from "../config/constants.js";
import {
  LANGUAGE_TAGS,
  fromModelScript,
  needsTranslation,
  splitSentences,
  tidyTranslation,
  toModelScript,
  translationDirection
} from "./translation-text.js";

const KV_KINDS = ["decoder.key", "decoder.value", "encoder.key", "encoder.value"];

let ort = null;
let PreTrainedTokenizer = null;
let modelsUrl = "";

// direction -> Promise of a loaded model, kept for the life of the worker.
const models = new Map();

// Requests are handled strictly one after another.
let queue = Promise.resolve();

async function openCache() {
  try {
    return await caches.open(TRANSLATOR_CACHE_NAME);
  }
  catch {
    // No cache storage (private browsing, storage blocked): work from memory.
    return null;
  }
}

// The ONNX runtime and the tokenizer code are vendored in public/vendor/onnx
// and loaded by URL so the build does not bundle them.
async function loadRuntime(baseUrl, threads) {
  if (ort) return;

  const transformers = await import(/* @vite-ignore */ `${baseUrl}vendor/onnx/transformers.min.js`);
  const runtime = await import(/* @vite-ignore */ `${baseUrl}vendor/onnx/ort.webgpu.min.mjs`);

  runtime.env.wasm.wasmPaths = `${baseUrl}vendor/onnx/`;
  // More than one thread needs a cross-origin isolated page.
  runtime.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.max(1, Math.min(threads || 1, navigator.hardwareConcurrency || 1))
    : 1;

  PreTrainedTokenizer = transformers.PreTrainedTokenizer;
  modelsUrl = `${modelsBaseUrl(baseUrl)}indictrans2/`;
  ort = runtime;
}

function readyMarker(direction) {
  return `${modelsUrl}${direction}/ready-v1`;
}

async function isDownloaded(direction) {
  const cache = await openCache();
  return Boolean(cache && (await cache.match(readyMarker(direction), MATCH_OPTIONS)));
}

// Downloads one file (or one part of it), reporting bytes as they arrive.
async function download(url, onBytes) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`translation file missing (${response.status})`);

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onBytes(buffer.byteLength);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    onBytes(value.byteLength);
  }
  return new Blob(chunks).arrayBuffer();
}

// Makes sure every file of a direction is in the cache, joining files that
// are stored as parts (see scripts/split-model.js). Returns a function that
// reads a file as bytes.
async function ensureFiles(direction, report) {
  const folder = `${modelsUrl}${direction}/`;
  const cache = await openCache();
  const memory = new Map();

  const cachedManifest = cache && (await cache.match(`${folder}manifest.json`, MATCH_OPTIONS));
  const manifestResponse = cachedManifest || (await fetch(`${folder}manifest.json`));
  if (!manifestResponse.ok) throw new Error("translation files are not available offline yet");
  const manifest = await manifestResponse.clone().json();

  const missing = [];
  for (const file of manifest.files) {
    if (!cache || !(await cache.match(`${folder}${file.name}`, MATCH_OPTIONS))) missing.push(file);
  }
  // False when some file could only be kept in memory.
  let complete = Boolean(cache);

  if (missing.length) {
    const total = missing.reduce((sum, file) => sum + file.size, 0);
    let received = 0;
    let lastPercent = -1;
    const onBytes = bytes => {
      received += bytes;
      const percent = Math.min(99, Math.floor((received / total) * 100));
      if (percent !== lastPercent) {
        lastPercent = percent;
        report("downloading", percent);
      }
    };
    report("downloading", 0);

    // A few files at a time: enough to use the connection well without
    // holding every part of a large file in memory at once.
    const pending = [...missing];
    const workers = Array.from({ length: 3 }, async () => {
      while (pending.length) {
        const file = pending.shift();
        const urls = file.parts
          ? file.parts.map(suffix => `${folder}${file.name}.part-${suffix}`)
          : [`${folder}${file.name}`];
        const buffers = [];
        for (const url of urls) buffers.push(await download(url, onBytes));

        const blob = new Blob(buffers);
        let stored = false;
        if (cache) {
          try {
            await cache.put(`${folder}${file.name}`, new Response(blob, {
              headers: { "Content-Type": "application/octet-stream" }
            }));
            stored = true;
          }
          catch (error) {
            // Usually a full device. Translate from memory this time; it is
            // downloaded again next time.
            console.warn(`Could not store ${file.name}:`, error);
          }
        }
        if (!stored) {
          memory.set(file.name, blob);
          complete = false;
        }
      }
    });
    await Promise.all(workers);
  }

  if (complete) {
    try {
      if (!cachedManifest) await cache.put(`${folder}manifest.json`, manifestResponse);
      await cache.put(readyMarker(direction), new Response("ready"));
    }
    catch {
      // Not stored: it is simply checked again next time.
    }
  }

  return async name => {
    const stored = memory.get(name) || (cache && (await cache.match(`${folder}${name}`, MATCH_OPTIONS)));
    if (!stored) throw new Error(`translation file ${name} is missing`);
    return new Uint8Array(await stored.arrayBuffer());
  };
}

async function createSession(read, graph, dataFile) {
  const data = await read(dataFile);
  return ort.InferenceSession.create(await read(graph), {
    executionProviders: ["wasm"],
    // Both spellings, because exporters write the data file's path either way.
    externalData: [
      { path: dataFile, data },
      { path: `./${dataFile}`, data }
    ]
  });
}

async function tokenizerFrom(read, name) {
  const json = JSON.parse(new TextDecoder().decode(await read(name)));
  return new PreTrainedTokenizer(json, { tokenizer_class: "PreTrainedTokenizerFast" });
}

function loadModel(direction, report) {
  if (!models.has(direction)) {
    const loading = (async () => {
      const read = await ensureFiles(direction, report);
      report("loading");

      const meta = JSON.parse(new TextDecoder().decode(await read("tokenizer_meta.json")));
      const generation = JSON.parse(new TextDecoder().decode(await read("generation_config.json")));
      const source = await tokenizerFrom(read, "tokenizer_src.json");
      const target = await tokenizerFrom(read, "tokenizer_tgt.json");

      // The two decoder graphs share one weights file.
      const encoder = await createSession(read, "encoder_model.onnx", "encoder_model.onnx.data");
      const decoder = await createSession(read, "decoder_model.onnx", "decoder_shared.onnx.data");
      const decoderWithPast = await createSession(read, "decoder_with_past_model.onnx", "decoder_shared.onnx.data");

      return {
        meta,
        source,
        target,
        encoder,
        decoder,
        decoderWithPast,
        startId: generation.decoder_start_token_id ?? 2,
        endId: generation.eos_token_id ?? 2,
        layers: (decoder.outputNames.length - 1) / KV_KINDS.length
      };
    })();

    // A failed load must not be remembered, or translation could never recover.
    loading.catch(() => models.delete(direction));
    models.set(direction, loading);
  }

  return models.get(direction);
}

function int64Tensor(values) {
  return new ort.Tensor("int64", BigInt64Array.from(values, value => BigInt(value)), [1, values.length]);
}

function tagId(model, tag) {
  return Number(model.source(tag, { add_special_tokens: false }).input_ids.data[0]);
}

// Greedy decoding of one sentence.
async function translateSentence(model, sentence, from, to) {
  const encoded = model.source(` ${toModelScript(sentence, from)}`);
  const ids = [
    tagId(model, LANGUAGE_TAGS[from]),
    tagId(model, LANGUAGE_TAGS[to]),
    ...Array.from(encoded.input_ids.data, Number)
  ].map(id => (id < model.meta.src_dict_size ? id : model.meta.unk_id));

  const mask = int64Tensor(ids.map(() => 1));
  const { last_hidden_state: encoderStates } = await model.encoder.run({
    input_ids: int64Tensor(ids),
    attention_mask: mask
  });

  const output = [model.startId];
  // Telugu and Hindi need more tokens than English for the same sentence.
  const limit = Math.min(256, ids.length * 3 + 16);
  let past = null;

  for (let step = 0; step < limit; step++) {
    const feed = { input_ids: int64Tensor([output[output.length - 1]]), encoder_attention_mask: mask };

    if (step === 0) {
      feed.encoder_hidden_states = encoderStates;
    }
    else {
      for (let layer = 0; layer < model.layers; layer++) {
        for (const kind of KV_KINDS) {
          feed[`past_key_values.${layer}.${kind}`] = past[`present.${layer}.${kind}`];
        }
      }
    }

    const result = await (step === 0 ? model.decoder : model.decoderWithPast).run(feed);
    past = result;

    const { data, dims } = result.logits;
    const vocabulary = dims[2];
    const offset = (dims[1] - 1) * vocabulary;
    let best = 0;
    for (let index = 1; index < vocabulary; index++) {
      if (data[offset + index] > data[offset + best]) best = index;
    }

    output.push(best);
    if (best === model.endId) break;
  }

  const decoded = model.target.decode(
    output.map(id => (id < model.meta.tgt_dict_size ? id : model.meta.unk_id)),
    { skip_special_tokens: true }
  );

  return tidyTranslation(fromModelScript(decoded, to));
}

async function translate(message) {
  const report = (phase, percent) => self.postMessage({
    type: "status",
    id: message.id,
    direction: translationDirection(message.from, message.to),
    phase,
    percent
  });

  if (!LANGUAGE_TAGS[message.from] || !LANGUAGE_TAGS[message.to]) {
    throw new Error(`cannot translate ${message.from} to ${message.to}`);
  }

  if (message.from === message.to) return message.text;

  await loadRuntime(message.baseUrl, message.threads);
  const model = await loadModel(translationDirection(message.from, message.to), report);

  const lines = [];
  for (const sentences of splitSentences(message.text)) {
    const translated = [];
    for (const sentence of sentences) {
      translated.push(needsTranslation(sentence)
        ? await translateSentence(model, sentence, message.from, message.to)
        : sentence);
    }
    lines.push(translated.join(" "));
  }
  return lines.join("\n");
}

// Gets a direction ready before it is needed. Without `download` it only
// loads a direction that is already on the device.
async function preload(message) {
  await loadRuntime(message.baseUrl, message.threads);
  if (!message.download && !models.has(message.direction) && !(await isDownloaded(message.direction))) {
    return false;
  }

  const report = (phase, percent) => self.postMessage({
    type: "status", id: message.id, direction: message.direction, phase, percent
  });
  await loadModel(message.direction, report);
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

  if (message.type !== "translate") return;

  queue = queue
    .then(() => translate(message))
    .then(text => self.postMessage({ type: "result", id: message.id, text }))
    .catch(error => {
      self.postMessage({ type: "error", id: message.id, error: error.message || String(error) });
    });
};
