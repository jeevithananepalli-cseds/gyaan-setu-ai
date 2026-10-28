import { registerActions } from "../../core/actions.js";
import { app, escapeHtml } from "../../core/dom.js";
import { state } from "../../core/state.js";
import { accountName } from "./auth.service.js";
import { textByLanguage, uiText } from "../../i18n/index.js";

export function renderAccountArea() {

  const container =
    document.getElementById("accountArea");

  if (!container) {
    return;
  }

  if (!state.currentAccountId) {

    container.innerHTML = `
      <button class="account-button primary" data-action="showAuthScreen()">
        ${uiText("login")}
      </button>
    `;

    return;
  }

  const name = escapeHtml(accountName());

  container.innerHTML = `
    <button
      class="account-chip"
      data-action="showProfileScreen()"
      aria-label="${uiText("profile")}: ${name}"
    >
      <span class="account-avatar" aria-hidden="true">${escapeHtml(accountName().slice(0, 1).toUpperCase())}</span>
      <span class="account-name">${name}</span>
    </button>
    <button class="account-button" data-action="logout()">
      ${uiText("logout")}
    </button>
  `;
}


export function showAuthScreen(
  mode = "login",
  message = ""
) {

  const isLogin =
    mode === "login";

  const authText = {
    badge: textByLanguage(
      "Offline student account",
      "ఆఫ్‌లైన్ విద్యార్థి ఖాతా",
      "ऑफलाइन विद्यार्थी खाता"
    ),
    loginTitle: textByLanguage(
      "Welcome back",
      "స్వాగతం",
      "वापसी पर स्वागत है"
    ),
    registerTitle: textByLanguage(
      "Create your student account",
      "మీ విద్యార్థి ఖాతాను సృష్టించండి",
      "अपना विद्यार्थी खाता बनाएँ"
    ),
    loginIntro: textByLanguage(
      "Log in to continue from where you stopped.",
      "మీరు ఆపిన చోటు నుండి కొనసాగించడానికి లాగిన్ అవ్వండి.",
      "जहाँ आपने छोड़ा था वहाँ से जारी रखने के लिए लॉगिन करें।"
    ),
    registerIntro: textByLanguage(
      "Your learning progress will be saved on this device.",
      "మీ అభ్యాస పురోగతి ఈ పరికరంలో సేవ్ చేయబడుతుంది.",
      "आपकी सीखने की प्रगति इस डिवाइस पर सेव होगी।"
    ),
    name: textByLanguage("Student name", "విద్యార్థి పేరు", "विद्यार्थी का नाम"),
    namePlaceholder: textByLanguage("Enter your name", "మీ పేరు నమోదు చేయండి", "अपना नाम दर्ज करें"),
    pin: textByLanguage("4-digit PIN", "4 అంకెల పిన్", "4 अंकों का पिन"),
    pinPlaceholder: textByLanguage("Enter 4 digits", "4 అంకెలను నమోదు చేయండి", "4 अंक दर्ज करें"),
    login: textByLanguage("Log in", "లాగిన్", "लॉगिन"),
    register: textByLanguage("Create account", "ఖాతాను సృష్టించండి", "खाता बनाएँ"),
    newStudent: textByLanguage("New student? Create an account", "కొత్త విద్యార్థి? ఖాతాను సృష్టించండి", "नए विद्यार्थी हैं? खाता बनाएँ"),
    existingStudent: textByLanguage("Already have an account? Log in", "ఇప్పటికే ఖాతా ఉందా? లాగిన్ అవ్వండి", "पहले से खाता है? लॉगिन करें"),
    note: textByLanguage(
      "This offline account is stored only in this browser on this device.",
      "ఈ ఆఫ్‌లైన్ ఖాతా ఈ పరికరంలోని ఈ బ్రౌజర్‌లో మాత్రమే నిల్వ చేయబడుతుంది.",
      "यह ऑफलाइन खाता इस डिवाइस के इसी ब्राउज़र में ही सेव होता है।"
    )
  };


  app.innerHTML = `
    <section class="auth-section">
      <div class="auth-card">
        <div class="auth-icon">🎓</div>
        <span class="hero-badge auth-badge">${authText.badge}</span>
        <h2>${isLogin ? authText.loginTitle : authText.registerTitle}</h2>
        <p class="auth-intro">
          ${isLogin ? authText.loginIntro : authText.registerIntro}
        </p>

        ${message ? `<p class="auth-message">${escapeHtml(message)}</p>` : ""}

        <form data-submit="${isLogin ? "handleLogin" : "handleRegister"}(event)">
          <label for="accountNameInput">${authText.name}</label>
          <input
            id="accountNameInput"
            name="studentName"
            type="text"
            minlength="2"
            maxlength="30"
            autocomplete="username"
            placeholder="${authText.namePlaceholder}"
            required
          >

          <label for="accountPinInput">${authText.pin}</label>
          <input
            id="accountPinInput"
            name="pin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]{4}"
            minlength="4"
            maxlength="4"
            autocomplete="${isLogin ? "current-password" : "new-password"}"
            placeholder="${authText.pinPlaceholder}"
            required
          >

          <button class="action-btn auth-submit" type="submit">
            ${isLogin ? authText.login : authText.register}
          </button>
        </form>

        <button
          class="auth-switch"
          data-action="showAuthScreen('${isLogin ? "register" : "login"}')"
        >
          ${isLogin ? authText.newStudent : authText.existingStudent}
        </button>

        <p class="auth-note">
          ${authText.note}
        </p>
      </div>
    </section>
  `;


  setTimeout(
    () => document.getElementById("accountNameInput")?.focus(),
    0
  );
}


registerActions({ showAuthScreen });
