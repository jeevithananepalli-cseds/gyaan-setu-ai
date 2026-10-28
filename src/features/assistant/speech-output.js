// Read-aloud for assistant answers, in English, Telugu or Hindi.
//
// Two ways to speak:
//   1. the device's own voice, when it has one for the language (instant);
//   2. the bundled English, Telugu and Hindi voices (src/ai/tts.*), which
//      work on any device and offline, at the cost of loading a voice model
//      first.
// Many browser voices are online services (Edge's "Online (Natural)"
// voices, Chrome's "Google" voices). Offline, only voices on the device are
// used, and the bundled voice when there is none.
import {
  cancelBundledVoice,
  cancelRequests,
  hasBundledVoice,
  isVoiceReady,
  preloadBundledVoice,
  startVoiceSession,
  synthesizeSpeech
} from "../../ai/tts.client.js";
import { detectLanguage, speechLanguageCodes } from "../../config/languages.js";
import { state } from "../../core/state.js";
import { getChatLanguage } from "./chat.view.js";
import { setVoiceInputStatus } from "./voice-input.js";
import { withLanguage, textByLanguage } from "../../i18n/index.js";

// Browsers cut a single long utterance short, and a short chunk means the
// bundled voice starts speaking sooner, so answers are spoken a sentence or
// two at a time.
const MAX_CHUNK_LENGTH = 180;

// The bundled voices take about as long to produce speech as the speech
// lasts, so they get one sentence at a time: the first is heard quickly and
// the next is prepared while it plays.
const BUNDLED_CHUNK_LENGTH = 60;

const LANGUAGE_NAMES = { English: "English", Telugu: "తెలుగు", Hindi: "हिंदी" };

const SCRIPT_LETTERS = {
  English: /\p{Script=Latin}/u,
  Telugu: /\p{Script=Telugu}/u,
  Hindi: /\p{Script=Devanagari}/u
};

export function isSpeechOutputSupported() {
  return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
}

// The device voices that can speak right now: all of them online, only the
// ones on the device (localService) offline.
export function usableVoices(voices, online = navigator.onLine) {
  return online ? voices : voices.filter(voice => voice.localService !== false);
}

function deviceVoiceList() {
  return isSpeechOutputSupported() ? usableVoices(window.speechSynthesis.getVoices()) : [];
}

// Strips what a voice would read out as noise: emoji, symbols, the label line.
export function cleanTextForSpeech(text) {
  return String(text)
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, " ")
    .replace(/[*_#•→←↩✓]/g, " ")
    .replace(/\s*\n\s*/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+/, "")
    .trim();
}

// Splits on sentence ends (including the Hindi danda), then packs sentences
// into chunks short enough to be spoken reliably.
export function splitIntoSpeechChunks(text, maxLength = MAX_CHUNK_LENGTH) {
  const sentences = text.match(/[^.!?।]+[.!?।]*/g) || [];
  const chunks = [];
  let current = "";

  for (const sentence of sentences.map(part => part.trim()).filter(Boolean)) {
    if (current && `${current} ${sentence}`.length > maxLength) {
      chunks.push(current);
      current = sentence;
    }
    else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function normaliseLanguageTag(tag) {
  return String(tag || "").replace("_", "-").toLowerCase();
}

// Picks an installed voice for the language: an exact regional match first
// (te-IN), then any voice of that language (te).
export function pickVoice(voices, languageCode) {
  const wanted = normaliseLanguageTag(languageCode);
  const base = wanted.split("-")[0];

  return (
    voices.find(voice => normaliseLanguageTag(voice.lang) === wanted) ||
    voices.find(voice => normaliseLanguageTag(voice.lang).split("-")[0] === base) ||
    null
  );
}

// Decides how an answer in `language` will be spoken:
//   "device"   the device has a voice for it
//   "bundled"  no device voice, but the app ships one
//   "attempt"  the voice list is empty (not loaded, or never exposed); the
//              language tag alone is often enough, so try
//   "none"     nothing can speak this language here
export function chooseSpeechEngine({ language, deviceVoice, deviceVoiceCount, bundledAvailable }) {
  if (deviceVoice) return "device";
  if (bundledAvailable) return "bundled";
  if (language === "English" || deviceVoiceCount === 0) return "attempt";
  return "none";
}

function showSpeechStatus(kind, english, telugu, hindi) {
  withLanguage(getChatLanguage(), () => {
    setVoiceInputStatus(kind, textByLanguage(english, telugu, hindi));
  });
}

function showMissingVoiceMessage(language) {
  const name = LANGUAGE_NAMES[language];

  showSpeechStatus(
    "denied",
    `🔊 This device has no ${name} voice installed. Add it in your device's text-to-speech settings to hear answers.`,
    `🔊 ఈ పరికరంలో ${name} వాయిస్ లేదు. సమాధానాలు వినడానికి పరికరం టెక్స్ట్-టు-స్పీచ్ సెట్టింగ్‌లలో దాన్ని జోడించండి.`,
    `🔊 इस डिवाइस में ${name} आवाज़ नहीं है। उत्तर सुनने के लिए डिवाइस की टेक्स्ट-टू-स्पीच सेटिंग में इसे जोड़ें।`
  );
}

function markSpeaking(button) {
  state.speechSynthesisActive = true;
  state.activeSpeechButton = button || null;

  if (state.activeSpeechButton) {
    state.activeSpeechButton.classList.add("speaking");
    state.activeSpeechButton.textContent = "⏹";
  }

  document.getElementById("stopSpeaking")?.classList.remove("hidden");
}


// ======================================================
// DEVICE VOICE
// ======================================================

// onFailure runs when the voice cannot speak at all (an online voice with no
// connection), so the bundled voice can take over.
function speakWithDeviceVoice(chunks, languageCode, voice, onFailure) {
  let started = false;

  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = languageCode;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;

    utterance.onstart = () => {
      started = true;
    };

    if (index === chunks.length - 1) {
      utterance.onend = stopSpeaking;
    }

    utterance.onerror = event => {
      // "interrupted" and "canceled" are our own stopSpeaking() calls.
      if (event.error === "interrupted" || event.error === "canceled") return;
      const failedBeforeSpeaking = !started;
      stopSpeaking();
      if (failedBeforeSpeaking && onFailure) onFailure(event.error);
    };

    window.speechSynthesis.speak(utterance);
  });
}


// ======================================================
// BUNDLED VOICE
// ======================================================

let audioContext = null;
let currentSource = null;

// Identifies the read-aloud in progress; anything belonging to an older one
// must stop quietly.
let activeBundledSession = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

// Browsers only let a page make sound after the learner has tapped or
// clicked something. Waits briefly for that permission instead of forever.
async function audioIsAllowed() {
  const context = getAudioContext();
  if (context.state === "running") return true;

  await Promise.race([
    context.resume().catch(() => {}),
    new Promise(resolve => setTimeout(resolve, 1500))
  ]);

  return context.state === "running";
}

function playSamples(samples, samplingRate) {
  return new Promise(resolve => {
    const context = getAudioContext();
    const buffer = context.createBuffer(1, samples.length, samplingRate);
    buffer.copyToChannel(samples, 0);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (currentSource === source) currentSource = null;
      resolve();
    };

    currentSource = source;
    source.start();
  });
}

// Audio already made or being made, by language and text, so an answer is
// produced once however often it is played. Oldest entries are dropped.
const preparedAudio = new Map();
const MAX_PREPARED = 60;
let backgroundIds = [];

function audioKey(language, chunk) {
  return `${language}|${chunk}`;
}

function rememberAudio(key, promise) {
  preparedAudio.set(key, promise);
  promise.catch(() => {
    if (preparedAudio.get(key) === promise) preparedAudio.delete(key);
  });

  while (preparedAudio.size > MAX_PREPARED) {
    preparedAudio.delete(preparedAudio.keys().next().value);
  }
}

// The pieces the bundled voice will say for an answer.
function bundledChunks(text, language) {
  const spokenText = cleanTextForSpeech(withoutAnswerLabel(text));
  return splitFirstChunk(
    splitIntoSpeechChunks(spokenText, BUNDLED_CHUNK_LENGTH)
      .filter(chunk => SCRIPT_LETTERS[language].test(chunk))
  );
}

// Starts making the audio for a new answer while the learner reads it, so
// tapping the speaker plays at once. Only when the voice is already loaded:
// this never starts a 109 MB download on its own. A newer answer replaces
// the older one's unfinished work.
export function prepareSpeech(text, language) {
  if (!SCRIPT_LETTERS[language] || !isVoiceReady(language)) return;

  if (pickVoice(deviceVoiceList(), speechLanguageCodes[language])) return;

  cancelRequests(backgroundIds);
  backgroundIds = [];

  for (const chunk of bundledChunks(text, language)) {
    const key = audioKey(language, chunk);
    if (preparedAudio.has(key)) continue;

    const request = synthesizeSpeech(language, chunk, null, null, { background: true });
    backgroundIds.push(request.id);
    rememberAudio(key, request);
  }
}

async function speakWithBundledVoice(chunks, language) {
  const voiceSession = startVoiceSession();
  activeBundledSession = voiceSession;

  const name = LANGUAGE_NAMES[language];
  // Tells the learner what is happening while a voice is fetched and
  // started, which can take a while the first time.
  const onStatus = status => {
    if (activeBundledSession !== voiceSession) return;

    if (status.phase === "downloading") {
      showSpeechStatus(
        "understanding",
        `🔊 Downloading the ${name} voice... ${status.percent}% (only needed once)`,
        `🔊 ${name} వాయిస్ డౌన్‌లోడ్ అవుతోంది... ${status.percent}% (ఒక్కసారి మాత్రమే)`,
        `🔊 ${name} आवाज़ डाउनलोड हो रही है... ${status.percent}% (सिर्फ़ एक बार)`
      );
    }
    else if (status.phase === "starting") {
      showSpeechStatus(
        "understanding",
        `🔊 Getting the ${name} voice ready...`,
        `🔊 ${name} వాయిస్ సిద్ధమవుతోంది...`,
        `🔊 ${name} आवाज़ तैयार हो रही है...`
      );
    }
    else {
      showSpeechStatus(
        "understanding",
        `🔊 Preparing the answer in ${name}...`,
        `🔊 ${name}లో సమాధానం సిద్ధమవుతోంది...`,
        `🔊 ${name} में उत्तर तैयार हो रहा है...`
      );
    }
  };

  // Ask for every chunk up front so the next one is ready when the current
  // one finishes playing.
  // Prepared pieces are reused; what this answer is waiting for must not be
  // dropped by a newer answer's preparation.
  const requests = chunks.map(chunk => {
    const key = audioKey(language, chunk);
    const prepared = preparedAudio.get(key);

    if (prepared) {
      backgroundIds = backgroundIds.filter(id => id !== prepared.id);
      return prepared;
    }

    const request = synthesizeSpeech(language, chunk, voiceSession, onStatus);
    rememberAudio(key, request);
    return request;
  });
  requests.forEach(request => request.catch(() => {}));

  try {
    for (const request of requests) {
      const { audio, samplingRate } = await request;
      if (activeBundledSession !== voiceSession) return;

      if (!(await audioIsAllowed())) {
        showSpeechStatus(
          "denied",
          "🔊 Tap the speaker button on the answer to hear it.",
          "🔊 వినడానికి సమాధానంపై ఉన్న స్పీకర్ బటన్‌ను నొక్కండి.",
          "🔊 सुनने के लिए उत्तर पर बने स्पीकर बटन को दबाएँ।"
        );
        break;
      }

      setVoiceInputStatus("idle");
      await playSamples(audio, samplingRate);
      if (activeBundledSession !== voiceSession) return;
    }
  }
  catch (error) {
    if (error.cancelled || activeBundledSession !== voiceSession) return;

    console.error("Bundled voice failed:", error);
    showSpeechStatus(
      "denied",
      `🔊 The ${name} voice could not be loaded (${error.message}). Connect to the internet once so it can be saved on this device.`,
      `🔊 ${name} వాయిస్ లోడ్ కాలేదు. దాన్ని ఈ పరికరంలో సేవ్ చేయడానికి ఒకసారి ఇంటర్నెట్‌కు కనెక్ట్ చేయండి.`,
      `🔊 ${name} आवाज़ लोड नहीं हो सकी। इसे इस डिवाइस पर सहेजने के लिए एक बार इंटरनेट से जुड़ें।`
    );
  }

  if (activeBundledSession === voiceSession) stopSpeaking();
}


// ======================================================
// SPEAK / STOP
// ======================================================

// Speaks `text`. `language` defaults to the language the text is written in,
// so a Telugu answer is read with a Telugu voice.
// The bundled voice takes longer the more it has to say, so a long first
// sentence is cut at its first comma: the learner hears something sooner and
// the rest is prepared while that plays.
export function splitFirstChunk(chunks, maxLength = 40) {
  const [first, ...rest] = chunks;
  if (!first || first.length <= maxLength) return chunks;

  const comma = first.indexOf(",", 6);
  if (comma < 0 || comma > first.length - 8) return chunks;

  return [first.slice(0, comma + 1), first.slice(comma + 1).trim(), ...rest];
}

// Warms up the bundled voice for a language the device cannot speak itself.
export function preloadVoiceFor(language) {
  if (!hasBundledVoice(language)) return;

  if (pickVoice(deviceVoiceList(), speechLanguageCodes[language])) return;

  preloadBundledVoice(language);
}

// The first line of an answer is often just a label ("📚 Offline Knowledge",
// "📘 Related Lesson: …"). It is not worth hearing, and skipping it gets to
// the answer sooner.
export function withoutAnswerLabel(text) {
  return String(text).replace(/^\s*[📚📘][^\n]*\n/u, "");
}

export function speakAssistantAnswer(text, button, language) {
  stopSpeaking();

  const spokenText = cleanTextForSpeech(withoutAnswerLabel(text));
  if (!spokenText) return false;

  const speechLanguage = language || detectLanguage(spokenText, getChatLanguage());
  const languageCode = speechLanguageCodes[speechLanguage] || speechLanguageCodes.English;
  const deviceVoices = deviceVoiceList();
  const deviceVoice = pickVoice(deviceVoices, languageCode);

  const engine = chooseSpeechEngine({
    language: speechLanguage,
    deviceVoice,
    // Offline, an empty list means no voice on the device, not "not loaded".
    deviceVoiceCount: navigator.onLine ? deviceVoices.length : -1,
    bundledAvailable: hasBundledVoice(speechLanguage)
  });

  if (engine === "none" || (engine !== "bundled" && !isSpeechOutputSupported())) {
    showMissingVoiceMessage(speechLanguage);
    return false;
  }

  let chunks = splitIntoSpeechChunks(
    spokenText,
    engine === "bundled" ? BUNDLED_CHUNK_LENGTH : MAX_CHUNK_LENGTH
  );

  if (engine === "bundled") {
    // The bundled voices only know their own script; a chunk with none of it
    // (a formula, an English name) has nothing they can say.
    chunks = bundledChunks(text, speechLanguage);
    if (!chunks.length) return false;

    markSpeaking(button);
    // Ask for sound now, while the tap that started this still counts.
    getAudioContext().resume().catch(() => {});
    speakWithBundledVoice(chunks, speechLanguage);
    return true;
  }

  markSpeaking(button);
  speakWithDeviceVoice(chunks, languageCode, deviceVoice, () => {
    // The device voice could not speak (often an online voice with no
    // connection): use the bundled voice instead.
    const bundled = hasBundledVoice(speechLanguage) ? bundledChunks(text, speechLanguage) : [];
    if (!bundled.length) return;
    markSpeaking(button);
    speakWithBundledVoice(bundled, speechLanguage);
  });
  return true;
}

export function stopSpeaking() {
  if (state.speechSynthesisActive && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  if (activeBundledSession !== null) {
    activeBundledSession = null;
    cancelBundledVoice();
  }

  if (currentSource) {
    const source = currentSource;
    currentSource = null;
    try {
      source.stop();
    }
    catch {
      // Already finished.
    }
  }

  state.speechSynthesisActive = false;

  if (state.activeSpeechButton) {
    state.activeSpeechButton.classList.remove("speaking");
    state.activeSpeechButton.textContent = "🔊";
    state.activeSpeechButton = null;
  }

  document.getElementById("stopSpeaking")?.classList.add("hidden");
}

// Voices load asynchronously in most browsers; asking early means the list is
// ready by the time the learner taps a speaker button.
if (isSpeechOutputSupported()) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}
