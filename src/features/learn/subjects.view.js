import { setActiveNav } from "../../core/router.js";
import { learningData } from "../../content/index.js";
import { registerActions } from "../../core/actions.js";
import { app, showError } from "../../core/dom.js";
import { state } from "../../core/state.js";
import { renderProgress } from "../progress/profile.view.js";
import { getClassProgress } from "../progress/progress.service.js";
import { getClassName, textByLanguage, uiText } from "../../i18n/index.js";

// ======================================================
// SUBJECT SCREEN
// ======================================================

export function showSubjectScreen() {

  const classKey =
    `class${state.selectedClass}`;

  const classData =
    learningData[classKey];


  if (!classData) {

    showError(
      "Content is not available."
    );

    return;
  }


  const progress =
    getClassProgress();


  setActiveNav("learn");

  app.innerHTML = `

    <button
      class="back-btn"
      data-action="showClassScreen()"
    >
      ← ${uiText("back")}
    </button>


    <section class="section-heading">

      <h2>
        ${getClassName(state.selectedClass)}
      </h2>

      <p>
        ${textByLanguage(
          "Choose your learning area.",
          "మీ అభ్యాస విభాగాన్ని ఎంచుకోండి.",
          "अपना अध्ययन क्षेत्र चुनें।"
        )}
      </p>

      <p>
        ${classData.chapters.length} ${textByLanguage("chapters available", "అధ్యాయాలు అందుబాటులో ఉన్నాయి", "अध्याय उपलब्ध हैं")}
      </p>

    </section>


    ${renderProgress(progress)}


    <div
      class="chapter-grid"
      style="margin-top:20px;"
    >

      <div
        class="chapter-card"
        data-action="showChapters()"
      >

        <div class="chapter-number">
          📗
        </div>

        <h3>
          ${classData.subject[state.selectedLanguage]}
        </h3>

        <p>
          ${textByLanguage(
            "Lessons, activities, quizzes and offline question support.",
            "పాఠాలు, కార్యకలాపాలు, క్విజ్‌లు మరియు ఆఫ్‌లైన్ ప్రశ్నల సహాయం.",
            "पाठ, गतिविधियाँ, प्रश्नोत्तरी और ऑफलाइन प्रश्न सहायता।"
          )}
        </p>

      </div>

    </div>

  `;


  window.scrollTo(0, 0);
}


registerActions({ showSubjectScreen });
