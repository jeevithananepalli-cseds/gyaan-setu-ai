// Practice: the quiz levels a learner did not do well in, and the questions
// they got wrong, so they can try them again.
import { setActiveNav } from "../../core/router.js";
import { learningData } from "../../content/index.js";
import { registerActions } from "../../core/actions.js";
import { app, escapeHtml } from "../../core/dom.js";
import { state } from "../../core/state.js";
import { saveAccountState } from "../auth/auth.service.js";
import { showLanguageScreen } from "../onboarding/language.view.js";
import { clearWrongAnswer } from "../progress/progress.service.js";
import { getWeakLevels } from "./levels.js";
import { startQuiz } from "./quiz.view.js";
import { getClassName, textByLanguage, uiText } from "../../i18n/index.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function findLesson(classNumber, chapterIndex, lessonIndex) {
  return learningData[`class${classNumber}`]?.chapters[chapterIndex]?.lessons[lessonIndex] || null;
}

function weakLevelCard(item) {
  const lesson = findLesson(item.classNumber, item.chapterIndex, item.lessonIndex);
  if (!lesson) return "";

  const percent = Math.round((item.best / item.total) * 100);
  const status = item.passed
    ? textByLanguage("Passed, but with mistakes", "ఉత్తీర్ణత, కానీ తప్పులతో", "पास, लेकिन गलतियों के साथ")
    : textByLanguage("Not passed yet", "ఇంకా ఉత్తీర్ణత కాలేదు", "अभी पास नहीं हुए");

  return `
    <div class="weak-level-card ${item.passed ? "passed" : "failed"}">
      <div class="weak-level-copy">
        <small>${getClassName(item.classNumber)} · ${textByLanguage("Level", "స్థాయి", "स्तर")} ${item.levelIndex + 1}</small>
        <strong>${escapeHtml(lesson.title[state.selectedLanguage])}</strong>
        <span class="weak-level-meta">
          ${textByLanguage("Best score", "ఉత్తమ స్కోర్", "सबसे अच्छा स्कोर")} ${item.best}/${item.total}
          · ${textByLanguage("Tried", "ప్రయత్నాలు", "प्रयास")} ${item.attempts}
          · ${status}
        </span>
        <span class="progress-track"><i style="width:${percent}%"></i></span>
      </div>
      <button class="action-btn" data-action="retryLevel(${item.classNumber}, ${item.chapterIndex}, ${item.lessonIndex}, ${item.levelIndex})">
        ↻ ${textByLanguage("Retry", "మళ్లీ ప్రయత్నించండి", "फिर से करें")}
      </button>
    </div>
  `;
}

function mistakeCard(item, index) {
  const lesson = findLesson(item.classNumber, item.chapterIndex, item.lessonIndex);
  const question = lesson?.quiz[item.questionIndex];
  if (!lesson || !question) return "";

  const options = question.options[state.selectedLanguage].map((option, optionIndex) => `
    <button class="quiz-option" aria-pressed="false" data-option="${optionIndex}" data-action="choosePracticeOption(this)">
      <span class="quiz-option-letter" aria-hidden="true">${OPTION_LETTERS[optionIndex]}</span>
      <span class="quiz-option-text">${escapeHtml(option)}</span>
    </button>
  `).join("");

  return `
    <div class="practice-card" data-practice-index="${index}">
      <span class="practice-topic">${getClassName(item.classNumber)} · ${escapeHtml(lesson.title[state.selectedLanguage])}</span>
      <h3>${escapeHtml(question.question[state.selectedLanguage])}</h3>
      <div class="practice-options">${options}</div>
      <button class="action-btn practice-check" disabled
        data-action="checkPractice(this, ${item.classNumber}, ${item.chapterIndex}, ${item.lessonIndex}, ${item.questionIndex})">
        ${textByLanguage("Check answer", "సమాధానం తనిఖీ చేయండి", "उत्तर जाँचें")}
      </button>
      <div class="quiz-explanation" hidden></div>
    </div>
  `;
}

export function showWrongAnswerPractice() {
  if (!state.currentAccountId) {
    showLanguageScreen();
    return;
  }

  const weakLevels = getWeakLevels();
  const mistakes = state.wrongAnswers.map(mistakeCard).filter(Boolean);

  setActiveNav("practice");

  const empty = !weakLevels.length && !mistakes.length;

  app.innerHTML = `
    <button class="back-btn" data-action="showHome()">
      ← ${uiText("back")}
    </button>

    <section class="section-heading">
      <h2>🎯 ${textByLanguage("Practice", "అభ్యాసం", "अभ्यास")}</h2>
      <p>${textByLanguage(
        "Quizzes where you can do better, and questions you got wrong.",
        "మీరు ఇంకా మెరుగ్గా చేయగల క్విజ్‌లు, మరియు మీరు తప్పుగా జవాబిచ్చిన ప్రశ్నలు.",
        "जिन प्रश्नोत्तरियों में आप और अच्छा कर सकते हैं, और जिन प्रश्नों के उत्तर गलत थे।"
      )}</p>
    </section>

    ${empty ? `
      <div class="empty-state practice-empty">
        <div class="large-emoji" aria-hidden="true">🌟</div>
        <h3>${textByLanguage("Nothing to practise right now", "ప్రస్తుతం సాధన చేయాల్సినవి ఏమీ లేవు", "अभी अभ्यास के लिए कुछ नहीं है")}</h3>
        <p>${textByLanguage(
          "Take a lesson quiz. Any level you score less than 4 out of 5 in will appear here.",
          "ఒక పాఠం క్విజ్ రాయండి. 5లో 4 కంటే తక్కువ వచ్చిన ఏ స్థాయి అయినా ఇక్కడ కనిపిస్తుంది.",
          "किसी पाठ की प्रश्नोत्तरी दें। जिस भी स्तर में 5 में से 4 से कम अंक आएँगे, वह यहाँ दिखेगा।"
        )}</p>
        <button class="action-btn" data-action="showLearn()">📖 ${textByLanguage("Go to lessons", "పాఠాలకు వెళ్ళండి", "पाठों पर जाएँ")}</button>
      </div>
    ` : ""}

    ${weakLevels.length ? `
      <section class="practice-section">
        <h3 class="practice-section-title">${textByLanguage("Quizzes to try again", "మళ్లీ ప్రయత్నించాల్సిన క్విజ్‌లు", "फिर से देने वाली प्रश्नोत्तरियाँ")}</h3>
        <div class="weak-level-list">${weakLevels.map(weakLevelCard).join("")}</div>
      </section>
    ` : ""}

    ${mistakes.length ? `
      <section class="practice-section">
        <h3 class="practice-section-title">${textByLanguage("Questions you got wrong", "మీరు తప్పుగా జవాబిచ్చిన ప్రశ్నలు", "जिन प्रश्नों के उत्तर गलत थे")}</h3>
        <div class="practice-list">${mistakes.join("")}</div>
      </section>
    ` : ""}
  `;

  window.scrollTo(0, 0);
}

export function retryLevel(classNumber, chapterIndex, lessonIndex, levelIndex) {
  state.selectedClass = classNumber;
  saveAccountState();
  startQuiz(chapterIndex, lessonIndex, levelIndex);
}

export function choosePracticeOption(button) {
  const card = button.closest(".practice-card");
  if (card.classList.contains("checked")) return;

  card.querySelectorAll(".quiz-option").forEach(option => {
    const chosen = option === button;
    option.classList.toggle("selected", chosen);
    option.setAttribute("aria-pressed", String(chosen));
  });

  card.querySelector(".practice-check").disabled = false;
}

export function checkPractice(button, classNumber, chapterIndex, lessonIndex, questionIndex) {
  const card = button.closest(".practice-card");
  const chosenButton = card.querySelector(".quiz-option.selected");
  if (!chosenButton || card.classList.contains("checked")) return;

  const question = findLesson(classNumber, chapterIndex, lessonIndex).quiz[questionIndex];
  const chosen = Number(chosenButton.dataset.option);
  const correct = question.answer;
  const options = card.querySelectorAll(".quiz-option");
  const correctText = question.options[state.selectedLanguage][correct];

  card.classList.add("checked");
  button.hidden = true;
  options.forEach(option => {
    option.disabled = true;
  });
  options[correct].classList.add("correct");

  if (chosen === correct) {
    clearWrongAnswer(classNumber, chapterIndex, lessonIndex, questionIndex);
    state.experiencePoints += 2;
    saveAccountState();
    card.classList.add("practice-complete");
  }
  else {
    options[chosen].classList.add("wrong");
  }

  const explanation = card.querySelector(".quiz-explanation");
  explanation.hidden = false;
  explanation.innerHTML = `
    <strong class="quiz-verdict">${chosen === correct
      ? `✓ ${textByLanguage("Correct! This one is cleared.", "సరైనది! ఇది పూర్తయింది.", "सही! यह प्रश्न हो गया।")}`
      : `✗ ${textByLanguage("Correct answer", "సరైన సమాధానం", "सही उत्तर")}: ${OPTION_LETTERS[correct]}. ${escapeHtml(correctText)}`}</strong>
    <p>${escapeHtml(question.explanation?.[state.selectedLanguage] || "")}</p>
  `;
}

registerActions({ showWrongAnswerPractice, retryLevel, choosePracticeOption, checkPractice });
