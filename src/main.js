// Startup: wires the shell, registers the service worker, shows the first screen.
import { updateOfflineAiStatus } from "./ai/offline-ai.client.js";
import { initActionDelegation } from "./core/actions.js";
import { initTheme } from "./core/theme.js";
import { updateNetworkStatus } from "./core/network.js";
import { state } from "./core/state.js";
import { chatInput, closeChat, openChat, sendMessage } from "./features/assistant/chat.view.js";
import { stopSpeaking } from "./features/assistant/speech-output.js";
import { finalizeVoiceQuestion, startListening, toggleVoiceLanguage } from "./features/assistant/voice-input.js";
import { loadCurrentAccount } from "./features/auth/auth.service.js";
import { renderAccountArea } from "./features/auth/auth.view.js";
import { showHome } from "./features/home/home.view.js";
import { showLanguageScreen } from "./features/onboarding/language.view.js";

// Every module that registers markup actions must be loaded, even when no
// other module imports it, or its buttons would do nothing.
import "./core/router.js";
import "./features/learn/chapters.view.js";
import "./features/learn/lesson.view.js";
import "./features/learn/picture-activity.js";
import "./features/learn/subjects.view.js";
import "./features/onboarding/class.view.js";
import "./features/progress/profile.view.js";
import "./features/quiz/practice.view.js";
import "./features/quiz/quiz.view.js";

console.time("Gyaan Startup");

initActionDelegation();
initTheme();
loadCurrentAccount();


// ======================================================
// CHAT EVENTS
// ======================================================

document
  .getElementById("chatFab")
  .addEventListener("click", openChat);

document
  .getElementById("closeChat")
  .addEventListener("click", closeChat);

document
  .getElementById("sendChat")
  .addEventListener("click", sendMessage);

document
  .getElementById("voiceInputButton")
  .addEventListener("click", startListening);

document
  .getElementById("voiceLanguageButton")
  .addEventListener("click", toggleVoiceLanguage);

document
  .getElementById("voiceStopButton")
  .addEventListener("click", finalizeVoiceQuestion);

document
  .getElementById("stopSpeaking")
  .addEventListener("click", stopSpeaking);

chatInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    sendMessage();
  }
});


// ======================================================
// NETWORK STATUS
// ======================================================

window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);


// ======================================================
// SERVICE WORKER
// ======================================================
// Only the production build emits service-worker.js; in `npm run dev` there
// is nothing to register and a stale worker would hide source changes.

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        console.log("Gyaan Setu offline system ready.");
      })
      .catch(error => {
        console.error("Service Worker Error:", error);
      });
  });
}


// ======================================================
// START APPLICATION
// ======================================================

updateNetworkStatus();
renderAccountArea();

if (state.currentAccountId) {
  showHome();
}
else {
  showLanguageScreen();
}

updateOfflineAiStatus();
console.timeEnd("Gyaan Startup");
