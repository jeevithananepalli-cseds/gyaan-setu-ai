import { registerActions } from "../../core/actions.js";
import { app } from "../../core/dom.js";
import { updateNetworkStatus } from "../../core/network.js";
import { setActiveNav } from "../../core/router.js";
import { state } from "../../core/state.js";
import { setItem } from "../../core/storage.js";
import { resetAssistantConversation } from "../assistant/chat.view.js";
import { stopSpeaking } from "../assistant/speech-output.js";
import { stopListening } from "../assistant/voice-input.js";
import { saveAccountState } from "../auth/auth.service.js";
import { renderAccountArea, showAuthScreen } from "../auth/auth.view.js";
import { showHome } from "../home/home.view.js";
import { applyShellLanguage, textByLanguage, uiText } from "../../i18n/index.js";

// ======================================================
// LANGUAGE SCREEN
// ======================================================

export function showLanguageScreen() {
  setActiveNav(1);


  app.innerHTML = `

    <button
      class="back-btn"
      data-action="showHome()"
    >
      ← ${uiText("back")}
    </button>


    <section class="section-heading">

      <h2>
        🌐 ${textByLanguage(
          "Choose Your Language",
          "మీ భాషను ఎంచుకోండి",
          "अपनी भाषा चुनें"
        )}
      </h2>

      <p>
        ${textByLanguage(
          "Select the language you are most comfortable learning in.",
          "మీకు సౌకర్యంగా ఉన్న భాషను ఎంచుకోండి.",
          "अपनी सुविधा की भाषा चुनें।"
        )}
      </p>

    </section>


    <div class="language-grid">

      ${languageCard(
        "A",
        "English",
        "Continue learning in English",
        "English"
      )}

      ${languageCard(
        "అ",
        "తెలుగు",
        "తెలుగులో నేర్చుకోండి",
        "Telugu"
      )}

      ${languageCard(
        "अ",
        "हिन्दी",
        "हिन्दी में सीखें",
        "Hindi"
      )}

    </div>

  `;


  window.scrollTo(0, 0);
}


export function languageCard(
  symbol,
  title,
  description,
  language
) {

  return `

    <button
      class="language-card"
      data-action="selectLanguage('${language}')"
    >

      <div class="language-symbol">
        ${symbol}
      </div>

      <h3>
        ${title}
      </h3>

      <p>
        ${description}
      </p>

    </button>

  `;
}


export function selectLanguage(language) {

  state.selectedLanguage =
    language;
  state.chatLanguage = null;
  stopListening();
  stopSpeaking();
  setItem(
    "gyaanLanguage",
    state.selectedLanguage
  );
  applyShellLanguage();
  updateNetworkStatus();

  if (state.currentAccountId) {
    saveAccountState();
    resetAssistantConversation();
    showHome();
    return;
  }

  state.languageChosenBeforeAuth = true;
  renderAccountArea();
  showAuthScreen();
}


registerActions({ showLanguageScreen, selectLanguage });
