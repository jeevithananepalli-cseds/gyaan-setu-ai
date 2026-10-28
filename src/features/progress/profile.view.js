import { setActiveNav } from "../../core/router.js";
import { isOfflinePackageDownloaded, downloadOfflinePackage, offlinePackageSize } from "../../ai/offline-downloader.js";
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


let isDownloadingModels = false;

function offlinePackageLanguage() {
  return state.selectedLanguage || "English";
}

function sizeText(language) {
  const megabytes = offlinePackageSize(language);
  return megabytes >= 1000 ? `${(megabytes / 1000).toFixed(1)} GB` : `${megabytes} MB`;
}

// Swaps the download button for the "saved" badge once everything is on the
// device. Checked after the profile is drawn, because it reads storage.
async function refreshOfflinePackageStatus() {
  const panel = document.getElementById("offlinePackage");
  if (!panel || isDownloadingModels) return;
  const ready = await isOfflinePackageDownloaded(offlinePackageLanguage());
  panel.classList.toggle("ready", ready);
}

export async function downloadOfflineModels() {
  if (isDownloadingModels) return;
  const panel = document.getElementById("offlinePackage");
  const bar = document.getElementById("downloadProgressBar");
  const text = document.getElementById("downloadProgressText");
  const language = offlinePackageLanguage();

  if (!navigator.onLine) {
    if (text) text.textContent = textByLanguage(
      "Connect to the internet (Wi-Fi) to download.",
      "డౌన్‌లోడ్ చేయడానికి ఇంటర్నెట్‌కు (Wi-Fi) కనెక్ట్ అవ్వండి.",
      "डाउनलोड करने के लिए इंटरनेट (वाई-फ़ाई) से जुड़ें।"
    );
    return;
  }

  isDownloadingModels = true;
  panel?.classList.add("downloading");

  try {
    await downloadOfflinePackage(language, percent => {
      if (bar) bar.style.width = `${percent}%`;
      if (text) text.textContent = textByLanguage(
        `Downloading… ${percent}%`,
        `డౌన్‌లోడ్ అవుతోంది… ${percent}%`,
        `डाउनलोड हो रहा है… ${percent}%`
      );
    });
    panel?.classList.add("ready");
  }
  catch (error) {
    console.error("Offline download failed:", error);
    if (text) text.textContent = textByLanguage(
      "The download stopped. Tap again to continue from where it stopped.",
      "డౌన్‌లోడ్ ఆగిపోయింది. ఆగిన చోటు నుండి కొనసాగించడానికి మళ్ళీ నొక్కండి.",
      "डाउनलोड रुक गया। जहाँ रुका था वहीं से जारी रखने के लिए फिर से दबाएँ।"
    );
  }
  finally {
    isDownloadingModels = false;
    panel?.classList.remove("downloading");
  }
}

export function renderOfflineAiSettings() {
  const language = offlinePackageLanguage();
  setTimeout(refreshOfflinePackageStatus);

  return `
    <div class="offline-ai-settings">
      <span class="offline-ai-settings-icon">🧠</span>
      <div id="offlinePackage" class="offline-package">
        <strong>${textByLanguage("Offline AI & Voices", "ఆఫ్‌లైన్ AI & వాయిస్", "ऑफलाइन AI और आवाज")}</strong>
        <p class="offline-package-saved">
          ✓ ${textByLanguage(
            "Saved on this device. Gyaan's AI, translation and voices work without the internet.",
            "ఈ పరికరంలో భద్రపరచబడింది. జ్ఞాన్ AI, అనువాదం మరియు వాయిస్‌లు ఇంటర్నెట్ లేకుండా పనిచేస్తాయి.",
            "इस डिवाइस पर सुरक्षित। ज्ञान का AI, अनुवाद और आवाज़ें बिना इंटरनेट के काम करती हैं।"
          )}
        </p>
        <div class="offline-package-download">
          <p>${textByLanguage(
            `Save everything for ${getLanguageDisplayName()} on this device (${sizeText(language)}, use Wi-Fi). Then Gyaan works fully offline.`,
            `${getLanguageDisplayName()} కోసం అన్నింటినీ ఈ పరికరంలో భద్రపరచండి (${sizeText(language)}, Wi-Fi ఉపయోగించండి). తర్వాత జ్ఞాన్ పూర్తిగా ఆఫ్‌లైన్‌లో పనిచేస్తుంది.`,
            `${getLanguageDisplayName()} के लिए सब कुछ इस डिवाइस पर सहेजें (${sizeText(language)}, वाई-फ़ाई इस्तेमाल करें)। फिर ज्ञान पूरी तरह ऑफलाइन काम करता है।`
          )}</p>
          <button id="downloadOfflineBtn" class="action-btn offline-package-button" data-action="downloadOfflineModels()">
            📥 ${textByLanguage("Download for offline use", "ఆఫ్‌లైన్ కోసం డౌన్‌లోడ్ చేయండి", "ऑफलाइन उपयोग के लिए डाउनलोड करें")}
          </button>
          <div class="offline-package-progress" aria-hidden="true">
            <div id="downloadProgressBar"></div>
          </div>
          <small id="downloadProgressText" class="offline-package-text" aria-live="polite"></small>
        </div>
      </div>
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


registerActions({ showProfileScreen, downloadOfflineModels });
