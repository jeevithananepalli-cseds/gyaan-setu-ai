import { setActiveNav } from "../../core/router.js";
import { registerActions } from "../../core/actions.js";
import { app, escapeHtml } from "../../core/dom.js";
import { state } from "../../core/state.js";
import { accountName } from "../auth/auth.service.js";
import { showLanguageScreen } from "../onboarding/language.view.js";
import { getBadgeList } from "./achievements.js";
import { getOverallProgress } from "./progress.service.js";
import { getClassName, getLanguageDisplayName, textByLanguage, uiText } from "../../i18n/index.js";

export function showProfileScreen() {

  if (!state.currentAccountId) {
    showLanguageScreen();
    return;
  }


  const overall =
    getOverallProgress();

  const badges =
    getBadgeList(overall.completed);


  setActiveNav("progress");

  app.innerHTML = `
    <button class="back-btn" data-action="showHome()">
      ← ${uiText("back")}
    </button>

    <section class="section-heading">
      <h2>👤 ${textByLanguage("Student Profile", "విద్యార్థి ప్రొఫైల్", "विद्यार्थी प्रोफ़ाइल")}</h2>
      <p>${textByLanguage("Your offline learning record", "మీ ఆఫ్‌లైన్ అభ్యాస రికార్డు", "आपका ऑफलाइन सीखने का रिकॉर्ड")}</p>
    </section>

    <section class="profile-panel">
      <div class="profile-identity">
        <div class="profile-avatar">${escapeHtml(accountName().slice(0, 1).toUpperCase())}</div>
        <div>
          <h2>${escapeHtml(accountName())}</h2>
          <p>${getLanguageDisplayName()} · ${state.selectedClass ? getClassName(state.selectedClass) : textByLanguage("No class selected", "తరగతి ఎంచుకోలేదు", "कक्षा नहीं चुनी गई")}</p>
        </div>
      </div>

      <div class="profile-stats">
        <div><strong>${state.experiencePoints}</strong><span>XP</span></div>
        <div><strong>${overall.completed}</strong><span>${textByLanguage("Lessons", "పాఠాలు", "पाठ")}</span></div>
        <div><strong>${state.wrongAnswers.length}</strong><span>${textByLanguage("To practise", "అభ్యాసం చేయాలి", "अभ्यास बाकी")}</span></div>
      </div>
    </section>

    <section class="profile-section">
      <div class="section-heading">
        <h2>🧠 ${textByLanguage("Offline AI", "ఆఫ్‌లైన్ AI", "ऑफलाइन AI")}</h2>
        <p>${textByLanguage("Gyaan can prepare a small learning model on this device.", "Gyaan ఈ పరికరంలో చిన్న అభ్యాస మోడల్‌ను సిద్ధం చేయగలదు.", "ज्ञान इस डिवाइस पर छोटा सीखने वाला मॉडल तैयार कर सकता है।")}</p>
      </div>
      ${renderOfflineAiSettings()}
    </section>

    <section class="profile-section">
      <div class="section-heading">
        <h2>🏅 ${textByLanguage("Badges", "బ్యాడ్జ్‌లు", "बैज")}</h2>
      </div>
      <div class="badge-grid">
        ${badges}
      </div>
    </section>

    <section class="profile-section">
      <div class="section-heading">
        <h2>🧠 ${textByLanguage("Practice Mistakes", "తప్పులను అభ్యాసం చేయండి", "गलत उत्तरों का अभ्यास करें")}</h2>
        <p>${textByLanguage("Review questions you missed in quizzes.", "క్విజ్‌లలో మీరు తప్పిన ప్రశ్నలను సమీక్షించండి.", "क्विज़ में छूटे प्रश्नों को दोहराएँ।")}</p>
      </div>
      <button class="action-btn practice-button" data-action="showWrongAnswerPractice()">
        ${textByLanguage("Open Practice", "అభ్యాసం తెరవండి", "अभ्यास खोलें")}
      </button>
    </section>
  `;

  window.scrollTo(0, 0);
}


export function getOfflineAiDisplayState() {
  if (state.offlineAiState === "ready") return textByLanguage("Gyaan Ready • Offline", "జ్ఞాన్ సిద్ధంగా ఉంది • ఆఫ్‌లైన్", "ज्ञान तैयार • ऑफलाइन");
  if (state.offlineAiState === "lite") return textByLanguage("Gyaan Lite Mode", "జ్ఞాన్ లైట్ మోడ్", "ज्ञान लाइट मोड");
  if (state.offlineAiState === "loading") return textByLanguage("Starting Gyaan…", "జ్ఞాన్ ప్రారంభమవుతోంది…", "ज्ञान शुरू हो रहा है…");
  if (state.offlineAiState === "preparing") return textByLanguage("Starting Gyaan…", "జ్ఞాన్ ప్రారంభమవుతోంది…", "ज्ञान शुरू हो रहा है…");
  if (state.offlineAiState === "waiting") return textByLanguage("Starting Gyaan…", "జ్ఞాన్ ప్రారంభమవుతోంది…", "ज्ञान शुरू हो रहा है…");
  if (state.offlineAiState === "unsupported" || state.offlineAiState === "fallback") return textByLanguage("Smart Offline Assistant", "స్మార్ట్ ఆఫ్‌లైన్ సహాయకుడు", "स्मार्ट ऑफलाइन सहायक");
  if (state.offlineAiState === "not-started") return textByLanguage("Smart Offline Assistant", "స్మార్ట్ ఆఫ్‌లైన్ అసిస్టెంట్", "स्मार्ट ऑफलाइन असिस्टेंट");
  return textByLanguage("Ready offline", "ఆఫ్‌లైన్‌లో సిద్ధంగా ఉంది", "ऑफलाइन तैयार है");
}


export function renderOfflineAiSettings() {
  return `
    <div class="offline-ai-settings">
      <span class="offline-ai-settings-icon">🧠</span>
      <div>
        <strong>${textByLanguage("Offline AI", "ఆఫ్‌లైన్ AI", "ऑफलाइन AI")}</strong>
        <p>${getOfflineAiDisplayState()}</p>
      </div>
      <button class="text-link" data-action="showHome(); openChat()">
        ${textByLanguage("View", "చూడండి", "देखें")}
      </button>
    </div>
  `;
}


// ======================================================
// PROGRESS COMPONENT
// ======================================================

export function renderProgress(progress) {

  return `

    <div class="class-progress-card">

      <div class="class-progress-top">

        <span>
          📈
          ${textByLanguage(
            "Learning Progress",
            "అభ్యాస పురోగతి",
            "सीखने की प्रगति"
          )}
        </span>

        <span>
          ${progress.percent}%
        </span>

      </div>


      <div class="class-progress-bar">

        <div
          class="class-progress-fill"
          style="width:${progress.percent}%"
        ></div>

      </div>

    </div>

  `;
}


registerActions({ showProfileScreen });
