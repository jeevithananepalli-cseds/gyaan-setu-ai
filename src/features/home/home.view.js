import { scheduleAiWarmup } from "../../ai/offline-ai.client.js";
import { registerActions } from "../../core/actions.js";
import { app, escapeHtml } from "../../core/dom.js";
import { setActiveNav } from "../../core/router.js";
import { state } from "../../core/state.js";
import { accountName } from "../auth/auth.service.js";
import { getJourneyLessons, journeyClassCard } from "./journey-card.js";
import { showLanguageScreen } from "../onboarding/language.view.js";
import {
  getClassProgressFor,
  getLastLessonDetails,
  getOverallProgress,
  lessonKey
} from "../progress/progress.service.js";
import { applyShellLanguage, getClassName, textByLanguage, uiText } from "../../i18n/index.js";

// ======================================================
// FEATURE CARD
// ======================================================

export function featureCard(
  icon,
  title,
  description
) {

  return `

    <div class="feature-card">

      <div class="feature-icon">
        ${icon}
      </div>

      <h3>
        ${title}
      </h3>

      <p>
        ${description}
      </p>

    </div>

  `;
}


function greeting() {

  const hour = new Date().getHours();

  if (hour < 12) {
    return textByLanguage("Good Morning", "శుభోదయం", "सुप्रभात");
  }

  if (hour < 17) {
    return textByLanguage("Good Afternoon", "శుభ మధ్యాహ్నం", "नमस्कार");
  }

  return textByLanguage("Good Evening", "శుభ సాయంత్రం", "शुभ संध्या");
}


// Sunrise over hills with a bridge across them: "Gyaan Setu" is a bridge
// of knowledge. Decorative only.
function heroScene() {
  return `
    <svg class="hero-scene" viewBox="0 0 420 260" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="heroSun" cx="50%" cy="45%" r="55%">
          <stop offset="0" stop-color="#fff3c4"/>
          <stop offset="0.55" stop-color="#ffc35a"/>
          <stop offset="1" stop-color="#ff8a4c"/>
        </radialGradient>
        <linearGradient id="heroHillFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8b7cf6"/>
          <stop offset="1" stop-color="#6d5ce8"/>
        </linearGradient>
        <linearGradient id="heroHillNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3b2f9e"/>
          <stop offset="1" stop-color="#241d6b"/>
        </linearGradient>
      </defs>

      <g fill="#fff">
        <circle cx="38" cy="34" r="2" opacity=".85"/>
        <circle cx="92" cy="62" r="1.5" opacity=".6"/>
        <circle cx="150" cy="24" r="2.2" opacity=".75"/>
        <circle cx="370" cy="40" r="1.6" opacity=".7"/>
        <circle cx="402" cy="88" r="1.3" opacity=".5"/>
        <path d="M120 48l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" opacity=".9"/>
        <path d="M352 104l1.8 4 4 1.8-4 1.8-1.8 4-1.8-4-4-1.8 4-1.8z" opacity=".75"/>
      </g>

      <circle cx="300" cy="128" r="78" fill="#ffd27a" opacity=".18"/>
      <circle cx="300" cy="128" r="52" fill="url(#heroSun)"/>

      <g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7">
        <path d="M188 70q6-6 12 0q6-6 12 0"/>
        <path d="M228 92q4-4 8 0q4-4 8 0"/>
      </g>

      <path d="M-460 196C-300 160-160 186 0 192C60 150 128 160 186 176S300 150 420 166V260H-460Z" fill="url(#heroHillFar)" opacity=".9"/>

      <g stroke="#ffe2b8" stroke-linecap="round">
        <path d="M110 212Q210 120 310 212" fill="none" stroke-width="5"/>
        <path d="M86 212H334" stroke-width="6"/>
        <path d="M135 192V212M160 178V212M185 169V212M210 166V212M235 169V212M260 178V212M285 192V212" stroke-width="2.5" opacity=".9"/>
        <path d="M110 212V236M310 212V236" stroke-width="7"/>
      </g>

      <path d="M-460 226C-320 204-150 230 0 222C78 196 150 214 220 220S352 200 420 210V260H-460Z" fill="url(#heroHillNear)"/>

      <text x="192" y="160" font-size="34">🦉</text>
      <text x="40" y="236" font-size="26">🌳</text>
      <text x="362" y="242" font-size="22">📚</text>
    </svg>
  `;
}


function exploreTile(tone, icon, title, description, action) {
  return `
    <button class="explore-tile tone-${tone}" data-action="${action}">
      <span class="explore-icon" aria-hidden="true">${icon}</span>
      <strong>${title}</strong>
      <small>${description}</small>
    </button>
  `;
}


export function showHome() {

  if (!state.currentAccountId) {
    showLanguageScreen();
    return;
  }

  console.time("HOME_READY");
  setActiveNav("home");
  applyShellLanguage();

  const overall = getOverallProgress();
  const lastDetails = getLastLessonDetails();
  const journeyLessons = getJourneyLessons();
  const currentClass = state.selectedClass || 1;
  const classProgress = getClassProgressFor(currentClass);
  const level = Math.max(1, Math.floor(state.experiencePoints / 50) + 1);
  const name = escapeHtml(accountName());

  app.innerHTML = `
    <section class="home-banner">
      <div class="banner-copy">
        <span class="banner-kicker">Gyaan Setu · ${textByLanguage("Bridge to knowledge", "జ్ఞాన వారధి", "ज्ञान का सेतु")}</span>
        <h2>${greeting()}, ${name}! <span aria-hidden="true">☀️</span></h2>
        <p>${textByLanguage("Small steps every day lead to big dreams.", "ప్రతిరోజూ చిన్న అడుగులు పెద్ద కలలకు దారి తీస్తాయి.", "हर दिन के छोटे कदम बड़े सपनों तक ले जाते हैं।")}</p>
        <button class="continue-card" data-action="continueLearning()">
          <span class="continue-icon" aria-hidden="true">📘</span>
          <span class="continue-copy">
            <small>${textByLanguage("Continue Learning", "అభ్యాసాన్ని కొనసాగించండి", "सीखना जारी रखें")}</small>
            <strong>${lastDetails ? lastDetails.title : textByLanguage("Start your first lesson", "మీ మొదటి పాఠాన్ని ప్రారంభించండి", "अपना पहला पाठ शुरू करें")}</strong>
            <em>${lastDetails ? lastDetails.className : textByLanguage("Choose a class and discover a new world.", "తరగతిని ఎంచుకుని కొత్త ప్రపంచాన్ని కనుగొనండి.", "कक्षा चुनें और नई दुनिया खोजें।")}</em>
            <span class="continue-progress">
              <span class="progress-track"><i style="width:${classProgress.percent}%"></i></span>
              <b>${classProgress.percent}%</b>
            </span>
          </span>
          <span class="continue-resume">${lastDetails ? textByLanguage("Resume", "కొనసాగించు", "जारी रखें") : textByLanguage("Start", "ప్రారంభించు", "शुरू करें")} →</span>
        </button>
      </div>

      ${heroScene()}
    </section>

    <section class="home-stats" aria-label="${textByLanguage("Learning progress", "అభ్యాస పురోగతి", "सीखने की प्रगति")}">
      <div class="stat-tile"><span aria-hidden="true">⭐</span><div><strong>${state.experiencePoints}</strong><small>${textByLanguage("stars", "స్టార్లు", "सितारे")}</small></div></div>
      <div class="stat-tile"><span aria-hidden="true">📗</span><div><strong>${overall.completed}/${overall.totalLessons}</strong><small>${textByLanguage("lessons done", "పాఠాలు పూర్తి", "पाठ पूरे")}</small></div></div>
      <div class="stat-tile"><span aria-hidden="true">🏅</span><div><strong>${level}</strong><small>${textByLanguage("level", "స్థాయి", "स्तर")}</small></div></div>
    </section>

    <section class="home-section">
      <h3>${textByLanguage("Explore", "అన్వేషించండి", "खोजें")}</h3>
      <div class="explore-grid">
        ${exploreTile("lavender", "📖", textByLanguage("Lessons", "పాఠాలు", "पाठ"), textByLanguage("Explore chapters", "అధ్యాయాలు చూడండి", "अध्याय देखें"), state.selectedClass ? "showChapters()" : "showClassScreen()")}
        ${exploreTile("mint", "✅", textByLanguage("Practice", "అభ్యాసం", "अभ्यास"), textByLanguage("Retry missed questions", "తప్పిన ప్రశ్నలు మళ్లీ ప్రయత్నించండి", "छूटे प्रश्न दोबारा करें"), "showWrongAnswerPractice()")}
        ${exploreTile("sky", "🤖", uiText("askGyaan"), textByLanguage("Get instant help", "వెంటనే సహాయం పొందండి", "तुरंत मदद पाएँ"), "openChat()")}
        ${exploreTile("peach", "📊", uiText("navProgress"), textByLanguage("Track your growth", "మీ ఎదుగుదల చూడండి", "अपनी प्रगति देखें"), "showProfileScreen()")}
      </div>
    </section>

    <section class="home-section">
      <div class="home-section-heading">
        <h3>${textByLanguage("Choose your class", "మీ తరగతిని ఎంచుకోండి", "अपनी कक्षा चुनें")}</h3>
        <span class="offline-stamp">${textByLanguage("Ready offline", "ఆఫ్‌లైన్ సిద్ధం", "ऑफलाइन तैयार")}</span>
      </div>
      <div class="class-tile-grid">
        ${journeyClassCard(1, "🐰")}
        ${journeyClassCard(2, "🐦")}
        ${journeyClassCard(3, "🌿")}
        ${journeyClassCard(4, "🚀")}
        ${journeyClassCard(5, "⭐")}
        ${journeyClassCard(6, "🌳")}
        ${journeyClassCard(7, "💡")}
        ${journeyClassCard(8, "🎓")}
        ${journeyClassCard(9, "⛰️")}
        ${journeyClassCard(10, "🏆")}
      </div>
    </section>

    <section class="home-section path-section">
      <div class="home-section-heading">
        <h3>${getClassName(currentClass)} · ${textByLanguage("Your learning path", "మీ అభ్యాస మార్గం", "आपकी सीखने की राह")}</h3>
        <button class="text-link" data-action="showLearn()">${textByLanguage("See all", "అన్నీ చూడండి", "सभी देखें")} →</button>
      </div>
      <div class="learning-path">
        ${journeyLessons.map((item, index) => {
          const complete = Boolean(state.completedLessons[lessonKey(currentClass, item.chapterIndex, item.lessonIndex)]);
          const active = !complete && (index === 0 || Boolean(state.completedLessons[lessonKey(currentClass, journeyLessons[index - 1].chapterIndex, journeyLessons[index - 1].lessonIndex)]));
          return `
            <button class="path-milestone ${complete ? "complete" : ""} ${active ? "active" : ""}" data-action="openLesson(${item.chapterIndex}, ${item.lessonIndex})">
              <span class="milestone-dot">${complete ? "✓" : index + 1}</span>
              <span class="milestone-copy"><small>${item.chapter.title[state.selectedLanguage]}</small><strong>${item.lesson.title[state.selectedLanguage]}</strong></span>
              <span class="milestone-status">${complete ? textByLanguage("Done", "పూర్తయింది", "पूरा") : active ? textByLanguage("Start", "ప్రారంభించు", "शुरू करें") : textByLanguage("Open", "తెరవండి", "खोलें")}</span>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;

  window.scrollTo(0, 0);
  console.timeEnd("HOME_READY");
  scheduleAiWarmup();
}


registerActions({ showHome });
