import { setActiveNav } from "../../core/router.js";
import { learningData } from "../../content/index.js";
import { registerActions } from "../../core/actions.js";
import { journeyClassCard } from "../home/journey-card.js";
import { app } from "../../core/dom.js";
import { state } from "../../core/state.js";
import { saveAccountState } from "../auth/auth.service.js";
import { showSubjectScreen } from "../learn/subjects.view.js";
import { getClassName, getLanguageDisplayName, textByLanguage, uiText } from "../../i18n/index.js";

// ======================================================
// CLASS SCREEN
// ======================================================

export function showClassScreen() {

  const heading =
    textByLanguage(
      "Choose Your Class",
      "మీ తరగతిని ఎంచుకోండి",
      "अपनी कक्षा चुनें"
    );


  const description =
    textByLanguage(
      "Select your class to start learning.",
      "నేర్చుకోవడం ప్రారంభించడానికి మీ తరగతిని ఎంచుకోండి.",
      "सीखना शुरू करने के लिए अपनी कक्षा चुनें।"
    );


  const icons = ["🐰", "🐦", "🌿", "🚀", "⭐", "🌳", "💡", "🎓", "⛰️", "🏆"];

  setActiveNav("learn");

  app.innerHTML = `
    <button
      class="back-btn"
      data-action="${state.currentAccountId ? "showHome()" : "showLanguageScreen()"}"
    >
      ← ${uiText("back")}
    </button>

    <section class="section-heading">
      <h2>${heading}</h2>
      <p>${description}</p>
    </section>

    <div class="class-tile-grid large">
      ${icons.map((icon, index) => journeyClassCard(index + 1, icon)).join("")}
    </div>

    <p class="handwritten-note">${textByLanguage("Great things await!", "గొప్ప విషయాలు ఎదురుచూస్తున్నాయి!", "शानदार चीज़ें इंतज़ार में हैं!")} ♡</p>
  `;

  window.scrollTo(0, 0);
}


export function classCard(
  number,
  icon,
  subtitle,
  chapterCount = null
) {

  return `

    <button
      class="class-card"
      data-action="selectClass(${number})"
    >

      <div class="class-icon">
        ${icon}
      </div>

      <h3>
        ${getClassName(number)}
      </h3>

      <p>
        ${subtitle}
      </p>

      ${chapterCount !== null ? `
        <small class="class-card-count">
          ${chapterCount} ${textByLanguage("chapters", "అధ్యాయాలు", "अध्याय")}
        </small>
      ` : ""}

    </button>

  `;
}


export function selectClass(number) {

  state.selectedClass =
    number;

  saveAccountState();

  showSubjectScreen();
}


registerActions({ showClassScreen, selectClass });
