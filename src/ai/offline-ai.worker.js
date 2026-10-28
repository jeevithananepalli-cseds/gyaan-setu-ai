import { AI_CACHE_NAME, MATCH_OPTIONS, modelsBaseUrl } from "../config/constants.js";
import { SYSTEM_PROMPT, trimToSentence } from "./prompts.js";

let pipeline = null;
let TextStreamer = null;
let InterruptableStoppingCriteria = null;

// Answers are kept to this many sentences: on a laptop's built-in graphics the
// model writes about four words a second, so every sentence saved is a few
// seconds sooner.
const MAX_SENTENCES = 2;

// The runtime is vendored in public/vendor/onnx and loaded by URL so the build
// does not bundle it. baseUrl is the app's root URL, sent by the page on init.
async function loadRuntime(baseUrl) {
  if (pipeline) return;
  const runtime = await import(/* @vite-ignore */ `${baseUrl}vendor/onnx/transformers.min.js`);
  const { env } = runtime;
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = modelsBaseUrl(baseUrl);
  // The service worker already keeps every model file in the AI cache, so a
  // second copy in the runtime's own cache would only use up 270 MB more.
  env.useBrowserCache = false;
  env.backends.onnx.wasm.wasmPaths = `${baseUrl}vendor/onnx/`;
  env.backends.onnx.wasm.numThreads = Math.min(2, navigator.hardwareConcurrency || 1);
  TextStreamer = runtime.TextStreamer;
  InterruptableStoppingCriteria = runtime.InterruptableStoppingCriteria;
  pipeline = runtime.pipeline;
}

// Whole sentences in text, not counting one still being written.
function completeSentences(text) {
  return Math.max(0, String(text).trim().split(/(?<=[.!?])\s+/).length - 1);
}

const MODEL_PATH = "SmolLM2-360M-Instruct";
let questionAnswerer = null;
let backend = "wasm";

function status(state) {
  self.postMessage({ type: "status", state });
}

// The model file is stored as parts (see SPLIT_FILES in the service worker),
// which joins them from the AI cache when the runtime asks for the file.
const MODEL_PARTS = ["aa", "ab", "ac"];

// Downloads the parts that are not on the device yet into the AI cache,
// reporting progress. Done here rather than left to the service worker, which
// would download all 270 MB before answering the runtime: no progress could
// be shown, and on a slow connection the browser stopped the service worker
// before it finished.
async function downloadModelParts(baseUrl) {
  let cache;
  try {
    cache = await caches.open(AI_CACHE_NAME);
  }
  catch {
    return; // No storage: the service worker downloads the file itself.
  }

  const folder = `${modelsBaseUrl(baseUrl)}${MODEL_PATH}/onnx/`;
  const urls = MODEL_PARTS.map(suffix => `${folder}model_q4f16.onnx.part-${suffix}`);
  const missing = [];
  for (const url of urls) {
    if (!(await cache.match(url, MATCH_OPTIONS))) missing.push(url);
  }
  if (!missing.length) return;

  const received = missing.map(() => 0);
  const sizes = missing.map(() => 0);
  let lastPercent = -1;
  const report = () => {
    // Wait until every part has reported its size, or the total is a guess.
    if (sizes.some(size => !size)) return;
    const total = sizes.reduce((sum, size) => sum + size, 0);
    const percent = Math.min(99, Math.floor((received.reduce((sum, bytes) => sum + bytes, 0) / total) * 100));
    if (percent === lastPercent) return;
    lastPercent = percent;
    self.postMessage({ type: "status", state: "preparing", progress: percent });
  };

  await Promise.all(missing.map(async (url, index) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`model file missing (${response.status})`);
    sizes[index] = Number(response.headers.get("Content-Length")) || 1;

    const reader = response.body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received[index] += value.byteLength;
      report();
    }

    await cache.put(url, new Response(new Blob(chunks), {
      headers: { "Content-Type": "application/octet-stream" }
    }));
  }));
}

async function loadQuestionAnswerer(device) {
  // The runtime reports every chunk it reads; the page only needs to hear
  // when the percentage changes.
  const lastPercent = new Map();
  return pipeline("text-generation", MODEL_PATH, {
    dtype: "q4f16",
    device,
    progress_callback: progress => {
      if (progress.status !== "progress") return;
      const percent = Math.round(progress.progress || 0);
      if (lastPercent.get(progress.file) === percent) return;
      lastPercent.set(progress.file, percent);
      self.postMessage({ type: "status", state: "preparing", progress: percent });
    }
  });
}

self.onmessage = async event => {
  const message = event.data || {};
  if (message.type === "init") {
    try {
      status("preparing");
      await loadRuntime(message.baseUrl);
      await downloadModelParts(message.baseUrl);
      const useWebGpu = message.device ? message.device === "webgpu" : Boolean(navigator.gpu);
      backend = useWebGpu ? "webgpu" : "wasm";
      try {
        questionAnswerer = await loadQuestionAnswerer(backend);
      }
      catch (error) {
        if (backend !== "webgpu") throw error;
        backend = "wasm";
        status("lite");
        questionAnswerer = await loadQuestionAnswerer(backend);
      }
      self.postMessage({ type: "ready", backend });
    }
    catch (error) {
      self.postMessage({ type: "error", error: error.message || String(error) });
    }
    return;
  }

  if (message.type === "answer" && questionAnswerer) {
    try {
      // The question always arrives in English (see prompts.js).
      const context = String(message.context || "").trim();
      const contextLine = context ? `\nRelevant lesson information:\n${context}` : "";
      const prompt = `<|im_start|>system
${SYSTEM_PROMPT}
<|im_end|>
<|im_start|>user
Question: ${message.question}${contextLine}
${message.instruction || "Answer clearly in two short sentences."}
Answer:
<|im_end|>
<|im_start|>assistant
`;
      // The answer is sent to the page as it is written, so the learner
      // starts reading (and Telugu or Hindi starts being translated) at once.
      const stopping = new InterruptableStoppingCriteria();
      let written = "";
      const streamer = new TextStreamer(questionAnswerer.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: piece => {
          written += piece;
          self.postMessage({ type: "partial", requestId: message.requestId, text: written });
          if (completeSentences(written) >= MAX_SENTENCES) stopping.interrupt();
        }
      });
      const result = await questionAnswerer(prompt, {
        max_new_tokens: 90,
        do_sample: false,
        return_full_text: false,
        streamer,
        stopping_criteria: stopping
      });
      const answer = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
      const cleanedAnswer = trimToSentence(String(answer || "")
        .replace(/<\|im_(end|start)\|>/g, "")
        .replace(/^assistant\s*:?\s*/i, "")
        .trim());
      if (!cleanedAnswer || cleanedAnswer.length < 2) {
        self.postMessage({
          type: "answer-error",
          requestId: message.requestId,
          question: message.question,
          error: "The local QA model did not find an answer."
        });
        return;
      }
      self.postMessage({
        type: "answer",
        requestId: message.requestId,
        answer: cleanedAnswer,
        question: message.question
      });
    }
    catch (error) {
      self.postMessage({
        type: "answer-error",
        requestId: message.requestId,
        question: message.question,
        error: error.message || String(error)
      });
    }
  }
};
