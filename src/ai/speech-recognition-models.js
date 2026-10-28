// The on-device speech recognition models (see speech-recognition.worker.js),
// kept apart from the worker so they can be tested.
//
// `bundled` is false for a language whose model is not in the app yet;
// voice input then uses the browser's own (online) recognition for it.
// `folder` is under public/models/. `readyFile` is the last file the runtime
// downloads; once it is stored, the language works offline.
export const SPEECH_MODELS = {
  English: {
    bundled: true,
    folder: "whisper/whisper-base.en",
    readyFile: "onnx/decoder_model_merged_quantized.onnx",
    options: {}
  },
  Telugu: {
    bundled: false,
    folder: "whisper/whisper-telugu-base",
    readyFile: "onnx/decoder_model_merged_quantized.onnx",
    options: { language: "telugu", task: "transcribe" }
  },
  Hindi: {
    bundled: false,
    folder: "whisper/whisper-hindi-base",
    readyFile: "onnx/decoder_model_merged_quantized.onnx",
    options: { language: "hindi", task: "transcribe" }
  }
};

// Phrases Whisper is known to produce from silence or background noise.
const HALLUCINATIONS = [
  /^\[.*\]$/,
  /^\(.*\)$/,
  /^(thank you|thanks for watching|you|bye)[.!]*$/i
];

const SCRIPT_LETTERS = {
  English: /\p{Script=Latin}/u,
  Telugu: /[\p{Script=Telugu}\p{Script=Latin}]/u,
  Hindi: /[\p{Script=Devanagari}\p{Script=Latin}]/u
};

// A transcript worth sending as a question: it has letters of the language
// (or English words, which learners mix in), and is not a known filler.
export function isUsableTranscript(text, language) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (HALLUCINATIONS.some(pattern => pattern.test(value))) return false;
  return (SCRIPT_LETTERS[language] || SCRIPT_LETTERS.English).test(value);
}
