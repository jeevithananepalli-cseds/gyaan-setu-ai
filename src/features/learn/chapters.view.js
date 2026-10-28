import { learningData } from "../../content/index.js";
import { registerActions } from "../../core/actions.js";
import { app } from "../../core/dom.js";
import { setActiveNav } from "../../core/router.js";
import { state } from "../../core/state.js";
import { getJourneyLessons } from "../home/journey-card.js";
import { showLanguageScreen } from "../onboarding/language.view.js";
import { isLessonComplete, lessonKey } from "../progress/progress.service.js";
import { getClassName, textByLanguage, uiText } from "../../i18n/index.js";

// ======================================================
// OPEN CHAPTER
// ======================================================

export function openChapter(
  chapterIndex
) {

  const classData = learningData[`class${state.selectedClass}`];
  if (!classData) {
    showLanguageScreen();
    return;
  }

  const chapter = classData.chapters[chapterIndex];


  if (
    !chapter.lessons ||
    chapter.lessons.length === 0
  ) {

    app.innerHTML = `

      <button
        class="back-btn"
        data-action="showChapters()"
      >
        ← ${uiText("back")}
      </button>


      <div class="empty-state">

        <div class="large-emoji">
          ${chapter.icon}
        </div>

        <h2>
          ${chapter.title[state.selectedLanguage]}
        </h2>

        <p>
          ${textByLanguage(
            "This content will be added in the next development stage.",
            "ఈ కంటెంట్ తదుపరి అభివృద్ధి దశలో చేర్చబడుతుంది.",
            "यह सामग्री अगले विकास चरण में जोड़ी जाएगी।"
          )}
        </p>

      </div>

    `;


    return;
  }


  let lessonCards = "";


  chapter.lessons.forEach(
    (lesson, lessonIndex) => {

      const complete =
        isLessonComplete(
          chapterIndex,
          lessonIndex
        );


      lessonCards += `

        <div
          class="chapter-card"
          data-action="
            openLesson(
              ${chapterIndex},
              ${lessonIndex}
            )
          "
        >

          <div class="card-top-row">

            <div class="chapter-number">
              ${lesson.visual || "📘"}
            </div>

            ${
              complete
                ? `
                  <span class="completed-badge">
                    ✓ Completed
                  </span>
                `
                : ""
            }

          </div>

          <h3>
            ${lesson.title[state.selectedLanguage]}
          </h3>

          <p>
            ${textByLanguage(
              "Tap to start learning.",
              "నేర్చుకోవడం ప్రారంభించడానికి నొక్కండి.",
              "सीखना शुरू करने के लिए टैप करें।"
            )}
          </p>

        </div>

      `;

    }
  );


  app.innerHTML = `

    <button
      class="back-btn"
      data-action="showChapters()"
    >
      ← ${uiText("back")}
    </button>


    <section class="section-heading">

      <h2>
        ${chapter.icon}
        ${chapter.title[state.selectedLanguage]}
      </h2>

      <p>
        ${chapter.description[state.selectedLanguage]}
      </p>

    </section>


    <div class="chapter-grid">

      ${lessonCards}

    </div>

  `;


  window.scrollTo(0, 0);
}


export function showChapters() {
  const classData = learningData[`class${state.selectedClass}`];
  if (!classData) {
    showLanguageScreen();
    return;
  }

  setActiveNav(1);
  const lessons = getJourneyLessons();
  app.innerHTML = `
    <button class="back-btn" data-action="showSubjectScreen()">← ${uiText("back")}</button>
    <section class="journey-page-heading"><span class="journey-kicker">${getClassName(state.selectedClass).toUpperCase()}</span><h2>${classData.subject[state.selectedLanguage]}</h2><p>${textByLanguage("Follow the path, one bright milestone at a time.", "ఒక్కో మైలురాయిని దాటుతూ మార్గాన్ని అనుసరించండి.", "एक-एक मील का पत्थर पार करते हुए राह पर चलें।")}</p></section>
    <div class="learning-path full-path">
      <span class="path-line" aria-hidden="true"></span>
      ${lessons.map((item, index) => {
        const complete = Boolean(state.completedLessons[lessonKey(state.selectedClass, item.chapterIndex, item.lessonIndex)]);
        return `<button class="path-milestone ${complete ? "complete" : index === 0 ? "active" : ""}" data-action="openLesson(${item.chapterIndex}, ${item.lessonIndex})"><span class="milestone-dot">${complete ? "✓" : index + 1}</span><span class="milestone-copy"><small>${item.chapter.title[state.selectedLanguage]}</small><strong>${item.lesson.title[state.selectedLanguage]}</strong></span><span class="milestone-status">${complete ? "⭐" : index === 0 ? textByLanguage("START", "ప్రారంభించు", "शुरू करें") : textByLanguage("OPEN", "తెరవండి", "खोलें")}</span></button>`;
      }).join("")}
    </div>
  `;
  window.scrollTo(0, 0);
}


registerActions({ openChapter, showChapters });
