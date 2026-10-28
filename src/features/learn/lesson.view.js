import { setActiveNav } from "../../core/router.js";
import { learningData } from "../../content/index.js";
import { registerActions } from "../../core/actions.js";
import { app } from "../../core/dom.js";
import { state } from "../../core/state.js";
import { saveAccountState } from "../auth/auth.service.js";
import { resolveLessonImageUrl } from "./lesson-image.js";
import { renderPictureActivity } from "./picture-activity.js";
import { showLanguageScreen } from "../onboarding/language.view.js";
import { saveLastLesson } from "../progress/progress.service.js";
import { textByLanguage, uiText } from "../../i18n/index.js";

// ======================================================
// CONTINUE LEARNING
// ======================================================

export function continueLearning() {

  if (!state.lastLesson) {

    showLanguageScreen();

    return;
  }


  state.selectedClass =
    state.lastLesson.classNumber;


  saveAccountState();


  openLesson(
    state.lastLesson.chapterIndex,
    state.lastLesson.lessonIndex
  );
}


// ======================================================
// OPEN LESSON
// ======================================================

export function openLesson(
  chapterIndex,
  lessonIndex
) {

  saveLastLesson(
    chapterIndex,
    lessonIndex
  );


  const lesson =
    learningData[
      `class${state.selectedClass}`
    ]
    .chapters[
      chapterIndex
    ]
    .lessons[
      lessonIndex
    ];


  const points =
    lesson.keyPoints[
      state.selectedLanguage
    ]
    .map(
      point =>
        `<li>${point}</li>`
    )
    .join("");


  const lessonImage = resolveLessonImageUrl(lesson);
  let visualHTML;


  if (lessonImage) {

    visualHTML = `

      <img
        class="lesson-image"
        src="${lessonImage}"
        alt="${lesson.title[state.selectedLanguage]}"
        data-fallback-src="./images/lessons/placeholder-education.svg"
      >

    `;

  }

  else {

    visualHTML = `

      <div class="lesson-fallback-visual">

        ${lesson.visual || "📘"}

      </div>

    `;

  }


  const pictureActivity =
    renderPictureActivity(
      lesson,
      chapterIndex,
      lessonIndex
    );


  setActiveNav("learn");

  app.innerHTML = `

    <button
      class="back-btn"
      data-action="openChapter(${chapterIndex})"
    >
      ← ${uiText("back")}
    </button>


    <article class="lesson-container">

      <h2 class="lesson-title">

        ${lesson.title[state.selectedLanguage]}

      </h2>


      ${visualHTML}


      <p class="lesson-description">

        ${lesson.explanation[state.selectedLanguage]}

      </p>


      <div class="info-box">

        <h3>
          ✨
          ${textByLanguage(
            "Key Points",
            "ముఖ్యాంశాలు",
            "मुख्य बिंदु"
          )}
        </h3>

        <ul>
          ${points}
        </ul>

      </div>


      <div class="info-box activity-box">

        <h3>
          🎯
          ${textByLanguage(
            "Try This Activity",
            "ఈ కార్యకలాపాన్ని ప్రయత్నించండి",
            "यह गतिविधि करें"
          )}
        </h3>

        <p>
          ${lesson.activity[state.selectedLanguage]}
        </p>

      </div>


      ${pictureActivity}


      <div class="lesson-actions">

        <button
          class="action-btn"
          data-action="
            startQuiz(
              ${chapterIndex},
              ${lessonIndex}
            )
          "
        >
          📝
          ${textByLanguage(
            "Start Quiz",
            "క్విజ్ ప్రారంభించండి",
            "प्रश्नोत्तरी शुरू करें"
          )}
        </button>


        <button
          class="action-btn green-btn"
          data-action="openChat()"
        >
          💬
          ${textByLanguage(
            "Ask Gyaan",
            "గ్యాన్‌ను అడగండి",
            "ज्ञान से पूछें"
          )}
        </button>

      </div>

    </article>

  `;


  window.scrollTo(0, 0);
}


registerActions({ continueLearning, openLesson });
