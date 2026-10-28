import { speechLanguageCodes } from "../../config/languages.js";
import { state } from "../../core/state.js";
import { getItem, setItem } from "../../core/storage.js";
import { startRecording } from "../../ai/microphone.js";
import { canRecogniseOnDevice, preloadSpeechModel, transcribeSpeech } from "../../ai/speech-recognition.client.js";
import { chatInput, getChatLanguage, sendMessage } from "./chat.view.js";
import { textByLanguage, withLanguage } from "../../i18n/index.js";

// ======================================================
// SPEAKING LANGUAGE
// ======================================================
// Speech recognition listens for one language at a time. In a Telugu or
// Hindi chat it listens in that language unless the learner switches the
// microphone to English (many ask science questions in English). Spoken
// English heard as Telugu came out as Telugu-letter gibberish, so the
// question was never answered. Whatever the learner speaks in, the answer
// is still in the chat language. The choice is remembered per chat language.

const VOICE_LANGUAGE_KEY = "gyaanVoiceLanguage";

const VOICE_LANGUAGE_LABELS = { English: "EN", Telugu: "తె", Hindi: "हि" };

function savedVoiceLanguages() {
  try {
    return JSON.parse(getItem(VOICE_LANGUAGE_KEY) || "{}") || {};
  }
  catch {
    return {};
  }
}

// The language the microphone listens for.
export function getVoiceLanguage() {
  const chatLanguage = getChatLanguage();
  if (chatLanguage === "English") return "English";
  return savedVoiceLanguages()[chatLanguage] === "English" ? "English" : chatLanguage;
}

export function toggleVoiceLanguage() {
  const chatLanguage = getChatLanguage();
  if (chatLanguage === "English") return;

  const saved = savedVoiceLanguages();
  saved[chatLanguage] = getVoiceLanguage() === "English" ? chatLanguage : "English";
  setItem(VOICE_LANGUAGE_KEY, JSON.stringify(saved));

  // Already listening: start again in the new language.
  if (state.isListeningForQuestion) {
    cancelVoiceInput();
    startListening();
    return;
  }
  setVoiceInputStatus("idle");
}

function languageName(language) {
  return {
    English: textByLanguage("English", "ఆంగ్లం", "अंग्रेज़ी"),
    Telugu: textByLanguage("Telugu", "తెలుగు", "तेलुगु"),
    Hindi: textByLanguage("Hindi", "హిందీ", "हिंदी")
  }[language];
}

function renderVoiceLanguageButton() {
  const button = document.getElementById("voiceLanguageButton");
  if (!button) return;

  const chatLanguage = getChatLanguage();
  const voiceLanguage = getVoiceLanguage();
  const other = voiceLanguage === "English" ? chatLanguage : "English";

  button.classList.toggle("hidden", chatLanguage === "English");
  button.textContent = VOICE_LANGUAGE_LABELS[voiceLanguage];
  button.dataset.voiceLanguage = voiceLanguage;
  const label = textByLanguage(
    `Speaking in ${languageName(voiceLanguage)}. Tap to speak in ${languageName(other)}.`,
    `${languageName(voiceLanguage)}లో మాట్లాడుతున్నారు. ${languageName(other)}లో మాట్లాడటానికి నొక్కండి.`,
    `${languageName(voiceLanguage)} में बोल रहे हैं। ${languageName(other)} में बोलने के लिए टैप करें।`
  );
  button.setAttribute("aria-label", label);
  button.title = label;
}

export function getSpeechLanguageCode() {
  return speechLanguageCodes[getVoiceLanguage()] || speechLanguageCodes.English;
}


export function setVoiceInputStatus(status, customMessage = "") {
  withLanguage(getChatLanguage(), () => renderVoiceInputStatus(status, customMessage));
}

function renderVoiceInputStatus(state, customMessage) {
  const status = document.getElementById("voiceInputStatus");
  const note = document.getElementById("voiceInputNote");
  const button = document.getElementById("voiceInputButton");
  if (!status || !button) return;

  renderVoiceLanguageButton();
  const spoken = languageName(getVoiceLanguage());

  const messages = {
    idle: textByLanguage(`🎤 Tap to speak (${spoken})`, `🎤 మాట్లాడటానికి నొక్కండి (${spoken})`, `🎤 बोलने के लिए टैप करें (${spoken})`),
    listening: textByLanguage(`🔴 Listening in ${spoken}... Speak your complete question`, `🔴 ${spoken}లో వింటున్నాను... మీ పూర్తి ప్రశ్న చెప్పండి`, `🔴 ${spoken} में सुन रहा हूँ... अपना पूरा प्रश्न बोलें`),
    understanding: textByLanguage("⏳ Understanding...", "⏳ అర్థం చేసుకుంటున్నాను...", "⏳ समझ रहा हूँ..."),
    recognized: textByLanguage("✅ Question recognized", "✅ ప్రశ్న గుర్తించబడింది", "✅ प्रश्न समझ लिया गया"),
    unsupported: textByLanguage(
      "🎤 Voice input is not supported here. You can type normally.",
      "🎤 ఇక్కడ వాయిస్ ఇన్‌పుట్‌కు మద్దతు లేదు. మీరు సాధారణంగా టైప్ చేయవచ్చు.",
      "🎤 यहाँ वॉइस इनपुट उपलब्ध नहीं है। आप सामान्य रूप से टाइप कर सकते हैं।"
    ),
    denied: textByLanguage(
      "🎤 Microphone permission was denied. You can type normally.",
      "🎤 మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. మీరు సాధారణంగా టైప్ చేయవచ్చు.",
      "🎤 माइक्रोफ़ोन की अनुमति नहीं मिली। आप सामान्य रूप से टाइप कर सकते हैं।"
    )
  };

  status.textContent = customMessage || messages[state] || messages.idle;
  status.className = `voice-input-status ${state === "denied" || state === "unsupported" ? "error" : state === "recognized" ? "success" : ""}`;
  if (note) {
    note.textContent = canRecogniseOnDevice(getVoiceLanguage())
      ? textByLanguage(
        "Voice input runs on this device and works offline. Nothing you say leaves the device.",
        "వాయిస్ ఇన్‌పుట్ ఈ పరికరంలోనే పనిచేస్తుంది, ఆఫ్‌లైన్‌లో కూడా. మీరు చెప్పేది పరికరం దాటి వెళ్లదు.",
        "वॉइस इनपुट इसी डिवाइस पर चलता है और ऑफलाइन भी काम करता है। आपकी बात डिवाइस से बाहर नहीं जाती।"
      )
      : textByLanguage(
        "Voice recognition in this language uses the browser's online service. Typing stays available offline.",
        "ఈ భాషలో వాయిస్ గుర్తింపు బ్రౌజర్ ఆన్‌లైన్ సేవను ఉపయోగిస్తుంది. టైపింగ్ ఆఫ్‌లైన్‌లో అందుబాటులో ఉంటుంది.",
        "इस भाषा में वॉइस पहचान ब्राउज़र की ऑनलाइन सेवा का उपयोग करती है। टाइपिंग ऑफलाइन उपलब्ध रहती है।"
      );
  }
  const stopLabel = document.getElementById("stopSpeakingLabel");
  if (stopLabel) {
    stopLabel.textContent = textByLanguage("Stop Speaking", "మాట్లాడటం ఆపండి", "बोलना बंद करें");
  }
  const voiceStopButton = document.getElementById("voiceStopButton");
  if (voiceStopButton) {
    voiceStopButton.classList.toggle("hidden", state !== "listening");
    voiceStopButton.textContent = textByLanguage("⏹ Stop ✓", "⏹ ఆపండి ✓", "⏹ रोकें ✓");
  }
  button.classList.toggle("listening", state === "listening");
  button.setAttribute("aria-label", messages[state] || messages.idle);
  button.title = button.getAttribute("aria-label");
}


// A status message in the chat language.
function voiceMessage(english, telugu, hindi) {
  return withLanguage(getChatLanguage(), () => textByLanguage(english, telugu, hindi));
}

export function createSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    state.isListeningForQuestion = true;
    setVoiceInputStatus("listening");
  };
  recognition.onresult = event => {
    // A result that arrives after the question was sent (stop() lets the
    // recogniser deliver one last result) must not be sent again as a
    // second, partial question.
    if (!state.isListeningForQuestion || state.voiceFinalizing) return;

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript?.trim() || "";
      if (transcript) {
        state.voiceSessionResults.set(index, {
          transcript,
          isFinal: result.isFinal
        });
      }
    }

    const finalParts = [];
    const interimParts = [];
    state.voiceSessionResults.forEach(result => {
      (result.isFinal ? finalParts : interimParts).push(result.transcript);
    });
    const transcript = [
      state.voiceSessionFinalTranscript,
      ...finalParts,
      ...interimParts
    ].join(" ").replace(/\s+/g, " ").trim();
    if (!transcript) return;

    chatInput.value = transcript;
    setVoiceInputStatus("listening");
    resetVoiceSilenceTimer();
  };
  recognition.onerror = event => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      cancelVoiceInput();
      setVoiceInputStatus("denied");
      return;
    }
    if (event.error === "aborted") {
      if (!state.voiceManuallyStopped && !state.voiceFinalizing) scheduleVoiceRestart();
      return;
    }
    if (event.error === "no-speech") {
      if (!state.voiceManuallyStopped && !state.voiceFinalizing) scheduleVoiceRestart();
      return;
    }
    if (event.error === "network") {
      cancelVoiceInput();
      setVoiceInputStatus("denied", voiceMessage(
        "🎤 Voice typing needs an internet connection on this device. You can type your question instead.",
        "🎤 ఈ పరికరంలో వాయిస్ టైపింగ్‌కు ఇంటర్నెట్ అవసరం. మీ ప్రశ్నను టైప్ చేయవచ్చు.",
        "🎤 इस डिवाइस पर बोलकर लिखने के लिए इंटरनेट चाहिए। आप अपना प्रश्न टाइप कर सकते हैं।"
      ));
      return;
    }
    if (event.error === "language-not-supported") {
      cancelVoiceInput();
      setVoiceInputStatus("denied", voiceMessage(
        "🎤 This browser cannot listen in this language. You can type your question instead.",
        "🎤 ఈ బ్రౌజర్ ఈ భాషలో వినలేదు. మీ ప్రశ్నను టైప్ చేయవచ్చు.",
        "🎤 यह ब्राउज़र इस भाषा में नहीं सुन सकता। आप अपना प्रश्न टाइप कर सकते हैं।"
      ));
      return;
    }
    cancelVoiceInput();
    setVoiceInputStatus(
      "denied",
      voiceMessage(
        "🎤 I could not hear that. You can try again or type normally.",
        "🎤 అది వినిపించలేదు. మళ్లీ ప్రయత్నించండి లేదా సాధారణంగా టైప్ చేయండి.",
        "🎤 मैं सुन नहीं पाया। फिर से कोशिश करें या सामान्य रूप से टाइप करें।"
      )
    );
  };
  recognition.onend = () => {
    if (state.voiceManuallyStopped || state.voiceFinalizing || !state.isListeningForQuestion) return;
    commitVoiceSession();
    scheduleVoiceRestart();
  };
  return recognition;
}


// ======================================================
// ON-DEVICE RECOGNITION (works offline)
// ======================================================
// Records the question and turns it into text on the device with Whisper.
// Used for every language whose model ships with the app; the browser's own
// recognition (below) needs the internet in most browsers.

async function startOnDeviceListening(language) {
  state.isListeningForQuestion = true;
  state.voiceManuallyStopped = false;
  state.voiceFinalizing = false;
  chatInput.value = "";
  setVoiceInputStatus("listening");

  // Start loading the model while the learner speaks.
  preloadSpeechModel(language, { download: true }).catch(() => {});

  let recording;
  try {
    recording = await startRecording({
      onSpeech: () => setVoiceInputStatus("listening", voiceMessage(
        "🔴 Listening... (stop talking when you have finished)",
        "🔴 వింటున్నాను... (పూర్తయ్యాక మాట్లాడటం ఆపండి)",
        "🔴 सुन रहा हूँ... (पूरा होने पर बोलना बंद करें)"
      ))
    });
  }
  catch (error) {
    state.isListeningForQuestion = false;
    console.warn("Microphone not available:", error);
    setVoiceInputStatus("denied");
    return;
  }

  state.onDeviceRecording = recording;
  const audio = await recording.done;
  state.onDeviceRecording = null;
  const wasCancelled = state.voiceManuallyStopped && !state.voiceFinalizing;
  state.isListeningForQuestion = false;
  state.voiceFinalizing = false;

  if (wasCancelled) return;
  if (!audio.length) {
    setVoiceInputStatus("idle", voiceMessage(
      "🎤 I did not hear a question. Tap the mic and speak again.",
      "🎤 ప్రశ్న వినిపించలేదు. మైక్ నొక్కి మళ్లీ మాట్లాడండి.",
      "🎤 कोई प्रश्न सुनाई नहीं दिया। माइक दबाकर फिर से बोलें।"
    ));
    return;
  }

  setVoiceInputStatus("understanding");
  let text;
  try {
    text = await transcribeSpeech(audio, language, status => {
      if (status.phase === "downloading") {
        setVoiceInputStatus("understanding", voiceMessage(
          `⏳ Getting voice input ready (first time only): ${status.percent}%`,
          `⏳ వాయిస్ ఇన్‌పుట్ సిద్ధమవుతోంది (మొదటిసారి మాత్రమే): ${status.percent}%`,
          `⏳ वॉइस इनपुट तैयार हो रहा है (सिर्फ़ पहली बार): ${status.percent}%`
        ));
      }
    });
  }
  catch (error) {
    console.warn("On-device speech recognition failed:", error);
    setVoiceInputStatus("denied", voiceMessage(
      "🎤 Voice input could not start. Connect to the internet once so it can be saved on this device, or type your question.",
      "🎤 వాయిస్ ఇన్‌పుట్ ప్రారంభం కాలేదు. దాన్ని ఈ పరికరంలో సేవ్ చేయడానికి ఒకసారి ఇంటర్నెట్‌కు కనెక్ట్ చేయండి, లేదా ప్రశ్నను టైప్ చేయండి.",
      "🎤 वॉइस इनपुट शुरू नहीं हो सका। इसे इस डिवाइस पर सहेजने के लिए एक बार इंटरनेट से जुड़ें, या प्रश्न टाइप करें।"
    ));
    return;
  }

  if (!text) {
    setVoiceInputStatus("idle", voiceMessage(
      "🎤 I could not make out the question. Please try again, a little louder.",
      "🎤 ప్రశ్న అర్థం కాలేదు. దయచేసి కొంచెం గట్టిగా మళ్లీ ప్రయత్నించండి.",
      "🎤 प्रश्न समझ नहीं आया। कृपया थोड़ा ज़ोर से फिर से कोशिश करें।"
    ));
    return;
  }

  chatInput.value = text;
  setVoiceInputStatus("recognized");
  state.voiceQuestionPending = true;
  sendMessage();
}


export function startListening() {
  if (state.isListeningForQuestion) {
    finalizeVoiceQuestion();
    return;
  }

  const language = getVoiceLanguage();
  if (canRecogniseOnDevice(language)) {
    startOnDeviceListening(language);
    return;
  }

  if (!state.speechRecognition) {
    state.speechRecognition = createSpeechRecognition();
  }
  if (!state.speechRecognition) {
    setVoiceInputStatus("unsupported");
    return;
  }

  clearTimeout(state.voiceSilenceTimer);
  clearTimeout(state.voiceRestartTimer);
  state.voiceSessionFinalTranscript = "";
  state.voiceSessionResults = new Map();
  state.voiceRestartCount = 0;
  state.voiceManuallyStopped = false;
  state.voiceFinalizing = false;
  chatInput.value = "";
  state.speechRecognition.lang = getSpeechLanguageCode();
  state.isListeningForQuestion = true;
  try {
    state.speechRecognition.start();
  }
  catch (error) {
    if (error.name !== "InvalidStateError") {
      console.error("Could not start voice input:", error);
      cancelVoiceInput();
      setVoiceInputStatus("denied");
    }
  }
}


export function stopListening() {
  cancelVoiceInput();
  setVoiceInputStatus("idle");
}


export function cancelVoiceInput() {
  state.isListeningForQuestion = false;
  state.voiceManuallyStopped = true;
  state.voiceFinalizing = false;
  clearTimeout(state.voiceSilenceTimer);
  clearTimeout(state.voiceRestartTimer);
  if (state.onDeviceRecording) {
    state.onDeviceRecording.cancel();
  }
  if (state.speechRecognition) {
    state.speechRecognition.abort();
  }
}


export function getVoiceTranscript() {
  const finalParts = [];
  const interimParts = [];
  state.voiceSessionResults.forEach(result => {
    (result.isFinal ? finalParts : interimParts).push(result.transcript);
  });
  return [
    state.voiceSessionFinalTranscript,
    ...finalParts,
    ...interimParts
  ].join(" ").replace(/\s+/g, " ").trim();
}


export function commitVoiceSession() {
  const sessionTranscript = Array.from(state.voiceSessionResults.values())
    .map(result => result.transcript)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (sessionTranscript) {
    state.voiceSessionFinalTranscript = [
      state.voiceSessionFinalTranscript,
      sessionTranscript
    ].join(" ").replace(/\s+/g, " ").trim();
  }
  state.voiceSessionResults = new Map();
}


export function resetVoiceSilenceTimer() {
  clearTimeout(state.voiceSilenceTimer);
  state.voiceSilenceTimer = window.setTimeout(() => {
    finalizeVoiceQuestion();
  }, 2100);
}


export function scheduleVoiceRestart() {
  if (
    !state.isListeningForQuestion ||
    state.voiceManuallyStopped ||
    state.voiceFinalizing ||
    state.voiceRestartCount >= 4 ||
    state.voiceRestartTimer
  ) {
    if (state.voiceRestartCount >= 4 && state.isListeningForQuestion) {
      finalizeVoiceQuestion();
    }
    return;
  }

  state.voiceRestartCount += 1;
  state.voiceRestartTimer = window.setTimeout(() => {
    state.voiceRestartTimer = null;
    if (!state.isListeningForQuestion || state.voiceManuallyStopped || state.voiceFinalizing) return;
    try {
      state.speechRecognition.lang = getSpeechLanguageCode();
      state.speechRecognition.start();
    }
    catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Could not restart voice input:", error);
        finalizeVoiceQuestion();
      }
    }
  }, 250);
}


export function finalizeVoiceQuestion() {
  // On-device recording: stop now and use what was said so far.
  if (state.onDeviceRecording) {
    state.voiceFinalizing = true;
    state.onDeviceRecording.stop();
    return;
  }

  if (!state.isListeningForQuestion && !getVoiceTranscript()) return;
  state.voiceFinalizing = true;
  state.voiceManuallyStopped = true;
  state.isListeningForQuestion = false;
  clearTimeout(state.voiceSilenceTimer);
  clearTimeout(state.voiceRestartTimer);

  const transcript = getVoiceTranscript();
  if (state.speechRecognition) {
    state.speechRecognition.stop();
  }
  if (!transcript) {
    setVoiceInputStatus("idle");
    return;
  }

  chatInput.value = transcript;
  setVoiceInputStatus("understanding");
  window.setTimeout(() => {
    if (!chatInput.value.trim()) return;
    setVoiceInputStatus("recognized");
    state.voiceQuestionPending = true;
    sendMessage();
    state.voiceSessionFinalTranscript = "";
    state.voiceSessionResults = new Map();
    state.voiceFinalizing = false;
  }, 350);
}
