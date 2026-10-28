// The lesson quiz: levels of five questions, answered first and marked on
// Submit, with the correct answer and an explanation for every question.
import { setActiveNav } from "../../core/router.js";
import { learningData } from "../../content/index.js";
import { registerActions } from "../../core/actions.js";
import { app, escapeHtml } from "../../core/dom.js";
import { state } from "../../core/state.js";
import { clearWrongAnswer, rememberWrongAnswer } from "../progress/progress.service.js";
import {
  getLevelResults,
  getLevels,
  isLevelUnlocked,
  nextLevelIndex,
  passMarkFor,
  recordLevelResult
} from "./levels.js";
import { textByLanguage, uiText } from "../../i18n/index.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function currentLesson() {
  const quiz = state.quiz;
  return learningData[`class${quiz.classNumber}`].chapters[quiz.chapterIndex].lessons[quiz.lessonIndex];
}

function currentLevelQuestions() {
  return getLevels(currentLesson())[state.quiz.levelIndex].questions;
}


// ======================================================
// START A LEVEL
// ======================================================

export function startQuiz(chapterIndex, lessonIndex, levelIndex) {
  const classNumber = state.selectedClass;
  const lesson = learningData[`class${classNumber}`].chapters[chapterIndex].lessons[lessonIndex];
  const levels = getLevels(lesson);

  if (!levels.length) return;

  let level = Number.isInteger(levelIndex)
    ? levelIndex
    : nextLevelIndex(classNumber, chapterIndex, lessonIndex, levels.length);

  if (!isLevelUnlocked(classNumber, chapterIndex, lessonIndex, level)) {
    level = nextLevelIndex(classNumber, chapterIndex, lessonIndex, levels.length);
  }

  const { start, questions } = levels[level];
  const passMark = passMarkFor(questions.length);

  state.quiz = {
    classNumber,
    chapterIndex,
    lessonIndex,
    levelIndex: level,
    levelCount: levels.length,
    start,
    selections: {},
    submitted: false
  };

  const cards = questions.map((item, position) => {
    const questionIndex = start + position;
    const options = item.options[state.selectedLanguage].map((option, optionIndex) => `
      <button
        class="quiz-option"
        data-option="${optionIndex}"
        aria-pressed="false"
        data-action="selectQuizOption(this, ${questionIndex}, ${optionIndex})"
      >
        <span class="quiz-option-letter" aria-hidden="true">${OPTION_LETTERS[optionIndex]}</span>
        <span class="quiz-option-text">${escapeHtml(option)}</span>
      </button>
    `).join("");

    return `
      <div class="quiz-card" data-question="${questionIndex}">
        <div class="quiz-progress">
          ${textByLanguage("Question", "ప్రశ్న", "प्रश्न")} ${position + 1} ${textByLanguage("of", "/", "/")} ${questions.length}
        </div>
        <h3>${position + 1}. ${escapeHtml(item.question[state.selectedLanguage])}</h3>
        <div class="quiz-options">${options}</div>
        <div class="quiz-explanation" hidden></div>
      </div>
    `;
  }).join("");

  setActiveNav("learn");

  app.innerHTML = `
    <button class="back-btn" data-action="openLesson(${chapterIndex}, ${lessonIndex})">
      ← ${uiText("back")}
    </button>

    <section class="section-heading">
      <h2>📝 ${escapeHtml(lesson.title[state.selectedLanguage])}</h2>
      <p>${textByLanguage(
        `Answer all ${questions.length} questions, then press Submit. Get at least ${passMark} right to unlock the next level.`,
        `మొత్తం ${questions.length} ప్రశ్నలకు సమాధానం ఇచ్చి, సమర్పించు నొక్కండి. తదుపరి స్థాయి తెరవడానికి కనీసం ${passMark} సరైనవి కావాలి.`,
        `सभी ${questions.length} प्रश्नों के उत्तर देकर जमा करें दबाएँ। अगला स्तर खोलने के लिए कम से कम ${passMark} सही उत्तर चाहिए।`
      )}</p>
    </section>

    ${levels.length > 1 ? `<nav class="quiz-levels" aria-label="${textByLanguage("Quiz levels", "క్విజ్ స్థాయిలు", "प्रश्नोत्तरी स्तर")}">${levelTabsHtml()}</nav>` : ""}

    <div id="quizResult" class="quiz-result" hidden></div>

    ${cards}

    <div class="quiz-submit-bar">
      <span id="quizAnsweredCount">${answeredText(0, questions.length)}</span>
      <button id="quizSubmit" class="action-btn" data-action="submitQuiz()" disabled>
        ${textByLanguage("Submit answers", "సమాధానాలు సమర్పించండి", "उत्तर जमा करें")}
      </button>
    </div>
  `;

  window.scrollTo(0, 0);
}

// The level tabs for the open quiz, from the saved results. Drawn again after
// Submit so a level that has just been unlocked can be opened at once.
function levelTabsHtml() {
  const { classNumber, chapterIndex, lessonIndex, levelIndex, levelCount } = state.quiz;
  const results = getLevelResults(classNumber, chapterIndex, lessonIndex);

  return Array.from({ length: levelCount }, (_, index) => {
    const result = results[index];
    const unlocked = isLevelUnlocked(classNumber, chapterIndex, lessonIndex, index);
    const status = result?.passed
      ? `✓ ${result.best}/${result.total}`
      : unlocked
        ? result ? `${result.best}/${result.total}` : textByLanguage("Open", "తెరిచి ఉంది", "खुला")
        : "🔒";

    return `
      <button
        class="quiz-level-tab ${index === levelIndex ? "active" : ""} ${result?.passed ? "passed" : ""} ${unlocked ? "" : "locked"}"
        data-action="startQuiz(${chapterIndex}, ${lessonIndex}, ${index})"
        ${unlocked ? "" : "disabled"}
        ${index === levelIndex ? 'aria-current="step"' : ""}
      >
        <strong>${textByLanguage("Level", "స్థాయి", "स्तर")} ${index + 1}</strong>
        <small>${status}</small>
      </button>
    `;
  }).join("");
}

function answeredText(answered, total) {
  return textByLanguage(
    `${answered} of ${total} answered`,
    `${total}లో ${answered} సమాధానాలు ఇచ్చారు`,
    `${total} में से ${answered} के उत्तर दिए`
  );
}


// ======================================================
// CHOOSE AN ANSWER (can be changed until Submit)
// ======================================================

export function selectQuizOption(button, questionIndex, optionIndex) {
  if (!state.quiz || state.quiz.submitted) return;

  const card = button.closest(".quiz-card");
  card.querySelectorAll(".quiz-option").forEach(option => {
    const chosen = option === button;
    option.classList.toggle("selected", chosen);
    option.setAttribute("aria-pressed", String(chosen));
  });

  state.quiz.selections[questionIndex] = optionIndex;

  const total = currentLevelQuestions().length;
  const answered = Object.keys(state.quiz.selections).length;

  document.getElementById("quizAnsweredCount").textContent = answeredText(answered, total);
  document.getElementById("quizSubmit").disabled = answered < total;
}


// ======================================================
// SUBMIT AND MARK
// ======================================================

function explanationFor(item, correctText) {
  const written = item.explanation?.[state.selectedLanguage];
  if (written) return written;

  return textByLanguage(
    `The correct answer is "${correctText}".`,
    `సరైన సమాధానం "${correctText}".`,
    `सही उत्तर "${correctText}" है।`
  );
}

export function submitQuiz() {
  const quiz = state.quiz;
  if (!quiz || quiz.submitted) return;

  const questions = currentLevelQuestions();
  if (Object.keys(quiz.selections).length < questions.length) return;

  quiz.submitted = true;
  let score = 0;

  questions.forEach((item, position) => {
    const questionIndex = quiz.start + position;
    const chosen = quiz.selections[questionIndex];
    const correct = item.answer;
    const isCorrect = chosen === correct;
    const card = app.querySelector(`.quiz-card[data-question="${questionIndex}"]`);
    const options = card.querySelectorAll(".quiz-option");
    const correctText = item.options[state.selectedLanguage][correct];

    options.forEach(option => {
      option.disabled = true;
    });
    options[correct].classList.add("correct");
    if (!isCorrect) options[chosen].classList.add("wrong");

    card.classList.add(isCorrect ? "answered-correct" : "answered-wrong");

    const explanation = card.querySelector(".quiz-explanation");
    explanation.hidden = false;
    explanation.innerHTML = `
      <strong class="quiz-verdict">${isCorrect
        ? `✓ ${textByLanguage("Correct!", "సరైనది!", "सही!")}`
        : `✗ ${textByLanguage("Not quite.", "సరికాదు.", "सही नहीं।")} ${textByLanguage("Correct answer", "సరైన సమాధానం", "सही उत्तर")}: ${OPTION_LETTERS[correct]}. ${escapeHtml(correctText)}`}</strong>
      <p>${escapeHtml(explanationFor(item, correctText))}</p>
    `;

    if (isCorrect) {
      score++;
      clearWrongAnswer(quiz.classNumber, quiz.chapterIndex, quiz.lessonIndex, questionIndex);
    }
    else {
      rememberWrongAnswer(quiz.chapterIndex, quiz.lessonIndex, questionIndex, chosen, correct);
    }
  });

  const result = recordLevelResult(
    quiz.classNumber,
    quiz.chapterIndex,
    quiz.lessonIndex,
    quiz.levelIndex,
    score,
    questions.length,
    quiz.levelCount
  );

  showResult(score, questions.length, result);

  const levelNav = app.querySelector(".quiz-levels");
  if (levelNav) levelNav.innerHTML = levelTabsHtml();

  const submitBar = app.querySelector(".quiz-submit-bar");
  if (submitBar) submitBar.hidden = true;
}

function showResult(score, total, { passed, lessonCompleted }) {
  const quiz = state.quiz;
  const hasNextLevel = quiz.levelIndex + 1 < quiz.levelCount;
  const panel = document.getElementById("quizResult");
  const levelName = `${textByLanguage("Level", "స్థాయి", "स्तर")} ${quiz.levelIndex + 1}`;

  let title;
  let message;
  let buttons;

  if (passed) {
    title = `${levelName} ${textByLanguage("passed!", "పూర్తయింది!", "पूरा हुआ!")}`;
    message = lessonCompleted || !hasNextLevel
      ? textByLanguage("You finished every level of this lesson.", "ఈ పాఠంలోని అన్ని స్థాయిలు పూర్తి చేశారు.", "आपने इस पाठ के सभी स्तर पूरे कर लिए।")
      : textByLanguage("The next level is now open.", "తదుపరి స్థాయి ఇప్పుడు తెరుచుకుంది.", "अगला स्तर अब खुल गया है।");
    buttons = hasNextLevel
      ? `<button class="action-btn" data-action="startQuiz(${quiz.chapterIndex}, ${quiz.lessonIndex}, ${quiz.levelIndex + 1})">${textByLanguage("Go to Level", "స్థాయికి వెళ్ళండి", "स्तर पर जाएँ")} ${quiz.levelIndex + 2} →</button>`
      : `<button class="action-btn" data-action="showChapters()">✓ ${textByLanguage("Continue Learning", "నేర్చుకోవడం కొనసాగించండి", "सीखना जारी रखें")}</button>`;
  }
  else {
    const needed = passMarkFor(total);
    title = textByLanguage("Keep practising!", "ఇంకా సాధన చేయండి!", "अभ्यास जारी रखें!");
    message = textByLanguage(
      `You need ${needed} correct answers to pass. Read the explanations below, then try again.`,
      `ఉత్తీర్ణత కోసం ${needed} సరైన సమాధానాలు కావాలి. కింది వివరణలు చదివి మళ్లీ ప్రయత్నించండి.`,
      `पास होने के लिए ${needed} सही उत्तर चाहिए। नीचे दिए स्पष्टीकरण पढ़ें और फिर से कोशिश करें।`
    );
    buttons = `
      <button class="action-btn" data-action="startQuiz(${quiz.chapterIndex}, ${quiz.lessonIndex}, ${quiz.levelIndex})">↻ ${textByLanguage("Try again", "మళ్లీ ప్రయత్నించండి", "फिर से कोशिश करें")}</button>
      <button class="back-btn quiz-secondary" data-action="openLesson(${quiz.chapterIndex}, ${quiz.lessonIndex})">📖 ${textByLanguage("Read the lesson", "పాఠం చదవండి", "पाठ पढ़ें")}</button>
    `;
  }

  panel.hidden = false;
  panel.className = `quiz-result ${passed ? "passed" : "failed"}`;
  panel.innerHTML = `
    <div class="quiz-result-emoji" aria-hidden="true">${passed ? (score === total ? "🏆" : "🎉") : "💪"}</div>
    <h2>${title}</h2>
    <p class="quiz-score">${textByLanguage("Your Score", "మీ స్కోర్", "आपका स्कोर")}: <strong>${score} / ${total}</strong></p>
    <p>${message}</p>
    <div class="quiz-result-actions">${buttons}</div>
  `;

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}


registerActions({ startQuiz, selectQuizOption, submitQuiz });
